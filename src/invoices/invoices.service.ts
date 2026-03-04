import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CouponsService } from '../coupons/coupons.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private couponsService: CouponsService,
  ) {}

  private generateInvoiceNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${timestamp}`;
  }

  async create(dto: CreateInvoiceDto) {
    // Calculate subtotal
    const subtotal = dto.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const tax = dto.tax ?? 0;
    let discount = 0;
    let couponId: bigint | undefined;

    // Validate coupon if provided
    if (dto.couponCode) {
      const result = await this.couponsService.validate(dto.couponCode, subtotal);
      discount = result.discount;
      couponId = BigInt(result.coupon.id);
    }

    const finalAmount = subtotal + tax - discount;

    const invoice = await this.prisma.$transaction(async (tx) => {
      // Validate stock for each item
      for (const item of dto.items) {
        const inv = await tx.inventory.findUnique({
          where: { variantId_branchId: { variantId: BigInt(item.variantId), branchId: BigInt(dto.branchId) } },
        });
        if (!inv || inv.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for variant ${item.variantId}`,
          );
        }
      }

      // Create the invoice
      const created = await tx.invoice.create({
        data: {
          invoiceNumber: this.generateInvoiceNumber(),
          customerId: dto.customerId ? BigInt(dto.customerId) : null,
          branchId: BigInt(dto.branchId),
          userId: BigInt(dto.userId),
          couponId: couponId ?? null,
          subtotal,
          discount,
          tax,
          finalAmount,
          status: 'COMPLETED',
          items: {
            create: dto.items.map((item) => ({
              variantId: BigInt(item.variantId),
              quantity: item.quantity,
              price: item.price,
              subtotal: item.quantity * item.price,
            })),
          },
        },
        include: { items: true },
      });

      // Deduct stock for each item
      for (const item of dto.items) {
        await tx.inventory.update({
          where: { variantId_branchId: { variantId: BigInt(item.variantId), branchId: BigInt(dto.branchId) } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            variantId: BigInt(item.variantId),
            branchId: BigInt(dto.branchId),
            type: 'SALE',
            quantity: -item.quantity,
            referenceId: created.id,
          },
        });
      }

      // Record coupon usage and increment used count
      if (dto.couponCode && couponId) {
        await tx.couponUsage.create({
          data: {
            couponId,
            invoiceId: created.id,
            customerId: dto.customerId ? BigInt(dto.customerId) : null,
          },
        });
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Create payment if payment method provided
      if (dto.paymentMethod) {
        await tx.payment.create({
          data: {
            invoiceId: created.id,
            paymentMethod: dto.paymentMethod,
            amount: finalAmount,
          },
        });
      }

      return created;
    });

    return this.findOne(Number(invoice.id));
  }

  findAll(branchId?: number, customerId?: number, status?: string) {
    return this.prisma.invoice.findMany({
      where: {
        ...(branchId ? { branchId: BigInt(branchId) } : {}),
        ...(customerId ? { customerId: BigInt(customerId) } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        customer: true,
        branch: true,
        user: { select: { id: true, name: true } },
        coupon: true,
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: BigInt(id) },
      include: {
        customer: true,
        branch: true,
        user: { select: { id: true, name: true } },
        coupon: true,
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async cancel(id: number) {
    const invoice = await this.findOne(id);
    if (invoice.status !== 'COMPLETED') {
      throw new BadRequestException('Only COMPLETED invoices can be cancelled');
    }

    await this.prisma.$transaction(async (tx) => {
      // Restore stock
      for (const item of invoice.items) {
        await tx.inventory.update({
          where: { variantId_branchId: { variantId: item.variantId, branchId: invoice.branchId } },
          data: { stockQuantity: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            branchId: invoice.branchId,
            type: 'SALE_CANCELLED',
            quantity: item.quantity,
            referenceId: invoice.id,
          },
        });
      }
      await tx.invoice.update({ where: { id: BigInt(id) }, data: { status: 'CANCELLED' } });
    });

    return this.findOne(id);
  }
}
