import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateExchangeDto } from './dto/create-exchange.dto';

@Injectable()
export class ReturnsService {
  constructor(
    private prisma: PrismaService,
    private couponsService: CouponsService,
  ) {}

  // ─── Return (Full or Partial) ─────────────────────────────────────────────

  async create(dto: CreateReturnDto) {
    // For invoice-linked returns: load original invoice to auto-calculate refund
    let originalInvoice: any = null;
    let branchId: bigint;
    let customerId: bigint | null = null;

    if (dto.invoiceId) {
      originalInvoice = await this.prisma.invoice.findUnique({
        where: { id: BigInt(dto.invoiceId) },
        include: { items: true },
      });
      if (!originalInvoice) throw new NotFoundException(`Invoice ${dto.invoiceId} not found`);
      branchId = originalInvoice.branchId;
      customerId = originalInvoice.customerId;
    } else if (dto.onlineOrderId) {
      const order = await this.prisma.onlineOrder.findUnique({
        where: { id: BigInt(dto.onlineOrderId) },
      });
      if (!order) throw new NotFoundException(`Online order ${dto.onlineOrderId} not found`);
      branchId = order.warehouseBranchId;
      customerId = order.customerId;
    } else {
      throw new BadRequestException('Either invoiceId or onlineOrderId is required');
    }

    // Auto-calculate refund amounts from original invoice prices
    const itemsWithRefund = dto.items.map((item) => {
      let refundAmount = 0;
      if (originalInvoice) {
        const original = originalInvoice.items.find(
          (i: any) => i.variantId.toString() === item.variantId.toString(),
        );
        if (!original) {
          throw new BadRequestException(
            `Variant ${item.variantId} was not part of invoice ${dto.invoiceId}`,
          );
        }
        if (item.quantity > original.quantity) {
          throw new BadRequestException(
            `Cannot return ${item.quantity} units of variant ${item.variantId} — only ${original.quantity} were purchased`,
          );
        }
        refundAmount = Number(original.price) * item.quantity;
      }
      return { ...item, refundAmount };
    });

    const totalRefund = itemsWithRefund.reduce((s, i) => s + i.refundAmount, 0);

    const result = await this.prisma.$transaction(async (tx) => {
      const ret = await tx.return.create({
        data: {
          returnType: dto.returnType,
          invoiceId: dto.invoiceId ? BigInt(dto.invoiceId) : null,
          onlineOrderId: dto.onlineOrderId ? BigInt(dto.onlineOrderId) : null,
          branchId,
          customerId,
          totalRefund,
          reason: dto.reason,
          items: {
            create: itemsWithRefund.map((item) => ({
              variantId: BigInt(item.variantId),
              quantity: item.quantity,
              refundAmount: item.refundAmount,
            })),
          },
        },
        include: { items: true },
      });

      // Restore stock
      for (const item of itemsWithRefund) {
        await tx.inventory.upsert({
          where: { variantId_branchId: { variantId: BigInt(item.variantId), branchId } },
          update: { stockQuantity: { increment: item.quantity } },
          create: { variantId: BigInt(item.variantId), branchId, stockQuantity: item.quantity },
        });
        await tx.stockMovement.create({
          data: {
            variantId: BigInt(item.variantId),
            branchId,
            type: 'RETURN',
            quantity: item.quantity,
            referenceId: ret.id,
          },
        });
      }

      // Update original invoice status
      if (dto.invoiceId && originalInvoice) {
        // Determine if ALL items are being returned → RETURNED, else → PARTIALLY_RETURNED
        const totalOriginalQty = originalInvoice.items.reduce(
          (s: number, i: any) => s + i.quantity,
          0,
        );
        const totalReturnedQty = dto.items.reduce((s, i) => s + i.quantity, 0);
        const newStatus = totalReturnedQty >= totalOriginalQty ? 'RETURNED' : 'PARTIALLY_RETURNED';

        await tx.invoice.update({
          where: { id: BigInt(dto.invoiceId) },
          data: { status: newStatus },
        });
      }

      return ret;
    });

    return this.findOne(Number(result.id));
  }

  // ─── Exchange ─────────────────────────────────────────────────────────────

  async createExchange(dto: CreateExchangeDto) {
    const gstPercent = dto.gstPercent ?? 0;

    // Load original invoice
    const originalInvoice = await this.prisma.invoice.findUnique({
      where: { id: BigInt(dto.invoiceId) },
      include: { items: true },
    });
    if (!originalInvoice) throw new NotFoundException(`Invoice ${dto.invoiceId} not found`);
    if (originalInvoice.status === 'RETURNED') {
      throw new BadRequestException('This invoice has already been fully returned');
    }

    // Calculate return credit from original invoice prices
    const returnItemsWithCredit = dto.returnItems.map((item) => {
      const original = originalInvoice.items.find(
        (i: any) => i.variantId.toString() === item.variantId.toString(),
      );
      if (!original) {
        throw new BadRequestException(
          `Variant ${item.variantId} was not part of invoice ${dto.invoiceId}`,
        );
      }
      if (item.quantity > original.quantity) {
        throw new BadRequestException(
          `Cannot return ${item.quantity} units of variant ${item.variantId} — only ${original.quantity} were purchased`,
        );
      }
      return { ...item, creditPerUnit: Number(original.price), returnCredit: Number(original.price) * item.quantity };
    });

    const totalReturnCredit = returnItemsWithCredit.reduce((s, i) => s + i.returnCredit, 0);

    // Load exchange items with prices from DB
    const exchangeItemsWithPrice: any[] = [];
    for (const item of dto.exchangeItems) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: BigInt(item.variantId) },
        include: {
          product: true,
          inventory: { where: { branchId: originalInvoice.branchId } },
        },
      });
      if (!variant) throw new NotFoundException(`Exchange variant ${item.variantId} not found`);
      const stock = variant.inventory?.[0];
      if (!stock || stock.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${variant.product.name}" (variant ${item.variantId}). Available: ${stock?.stockQuantity ?? 0}`,
        );
      }
      exchangeItemsWithPrice.push({
        ...item,
        price: Number(variant.sellingPrice),
        lineTotal: Number(variant.sellingPrice) * item.quantity,
        variantId: variant.id,
      });
    }

    const exchangeSubtotal = exchangeItemsWithPrice.reduce((s, i) => s + i.lineTotal, 0);

    // Apply coupon
    let discount = 0;
    let couponId: bigint | undefined;
    if (dto.couponCode) {
      const result = await this.couponsService.validate(dto.couponCode, exchangeSubtotal);
      discount = result.discount;
      couponId = result.coupon.id;
    }

    // Exchange bill maths
    const netAfterCredit = Math.max(0, exchangeSubtotal - totalReturnCredit - discount);
    const gstAmount = parseFloat(((netAfterCredit * gstPercent) / 100).toFixed(2));
    const finalAmount = parseFloat((netAfterCredit + gstAmount).toFixed(2));
    const isRefundDue = (exchangeSubtotal - totalReturnCredit - discount) < 0;
    const refundDueAmount = isRefundDue
      ? parseFloat((totalReturnCredit + discount - exchangeSubtotal).toFixed(2))
      : 0;

    // Determine original invoice status
    const totalOriginalQty = originalInvoice.items.reduce((s: number, i: any) => s + i.quantity, 0);
    const totalReturnedQty = dto.returnItems.reduce((s, i) => s + i.quantity, 0);
    const originalInvoiceStatus = totalReturnedQty >= totalOriginalQty ? 'RETURNED' : 'PARTIALLY_RETURNED';

    const exchangeResult = await this.prisma.$transaction(async (tx) => {
      // 1. Create Return record for the returned items
      const ret = await tx.return.create({
        data: {
          returnType: 'INVOICE',
          invoiceId: BigInt(dto.invoiceId),
          branchId: originalInvoice.branchId,
          customerId: originalInvoice.customerId,
          totalRefund: totalReturnCredit,
          reason: dto.reason ?? 'Exchange',
          items: {
            create: returnItemsWithCredit.map((item) => ({
              variantId: BigInt(item.variantId),
              quantity: item.quantity,
              refundAmount: item.returnCredit,
            })),
          },
        },
        include: { items: true },
      });

      // 2. Restore returned stock
      for (const item of returnItemsWithCredit) {
        await tx.inventory.upsert({
          where: { variantId_branchId: { variantId: BigInt(item.variantId), branchId: originalInvoice.branchId } },
          update: { stockQuantity: { increment: item.quantity } },
          create: { variantId: BigInt(item.variantId), branchId: originalInvoice.branchId, stockQuantity: item.quantity },
        });
        await tx.stockMovement.create({
          data: { variantId: BigInt(item.variantId), branchId: originalInvoice.branchId, type: 'RETURN', quantity: item.quantity, referenceId: ret.id },
        });
      }

      // 3. Update original invoice status
      await tx.invoice.update({
        where: { id: BigInt(dto.invoiceId) },
        data: { status: originalInvoiceStatus },
      });

      // 4. Create exchange invoice
      const exchangeInvoice = await tx.invoice.create({
        data: {
          invoiceNumber: `EXC-${Date.now().toString().slice(-8)}`,
          customerId: originalInvoice.customerId,
          branchId: originalInvoice.branchId,
          userId: originalInvoice.userId,
          couponId: couponId ? BigInt(couponId) : null,
          subtotal: exchangeSubtotal,
          discount,
          tax: gstAmount,
          returnCredit: totalReturnCredit,
          finalAmount,
          status: 'COMPLETED',
          items: {
            create: exchangeItemsWithPrice.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.lineTotal,
            })),
          },
        },
        include: { items: true },
      });

      // 5. Deduct exchange item stock
      for (const item of exchangeItemsWithPrice) {
        await tx.inventory.update({
          where: { variantId_branchId: { variantId: item.variantId, branchId: originalInvoice.branchId } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: { variantId: item.variantId, branchId: originalInvoice.branchId, type: 'SALE', quantity: -item.quantity, referenceId: exchangeInvoice.id },
        });
      }

      // 6. Coupon usage
      if (dto.couponCode && couponId) {
        await tx.couponUsage.create({
          data: { couponId: BigInt(couponId), invoiceId: exchangeInvoice.id, customerId: originalInvoice.customerId },
        });
        await tx.coupon.update({ where: { id: BigInt(couponId) }, data: { usedCount: { increment: 1 } } });
      }

      // 7. Payment (only if customer needs to pay extra)
      if (finalAmount > 0) {
        await tx.payment.create({
          data: { invoiceId: exchangeInvoice.id, paymentMethod: dto.paymentMethod, amount: finalAmount },
        });
      }

      // 8. Link return → exchange invoice
      await tx.return.update({
        where: { id: ret.id },
        data: { exchangeInvoiceId: exchangeInvoice.id },
      });

      return { ret, exchangeInvoice };
    });

    // Load full exchange invoice with all relations
    const fullExchangeInvoice = await this.prisma.invoice.findUnique({
      where: { id: exchangeResult.exchangeInvoice.id },
      include: {
        customer: true,
        branch: true,
        user: { select: { id: true, name: true, email: true } },
        coupon: true,
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
        exchangeReturn: { include: { items: { include: { variant: { include: { product: true } } } } } },
      },
    });

    return {
      exchangeInvoice: {
        ...fullExchangeInvoice,
        // Enrich with exchange breakdown
        breakdown: {
          exchangeSubtotal,
          returnCredit: totalReturnCredit,
          discount,
          gstPercent,
          gstAmount,
          finalAmount,
          isRefundDue,
          refundDueAmount,
        },
      },
      originalInvoiceStatus,
    };
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  findAll(branchId?: number, returnType?: string) {
    return this.prisma.return.findMany({
      where: {
        ...(branchId ? { branchId: BigInt(branchId) } : {}),
        ...(returnType ? { returnType: returnType as any } : {}),
      },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        customer: true,
        branch: true,
        exchangeInvoice: { include: { items: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const ret = await this.prisma.return.findUnique({
      where: { id: BigInt(id) },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        customer: true,
        branch: true,
        exchangeInvoice: {
          include: {
            items: { include: { variant: { include: { product: true } } } },
            payments: true,
          },
        },
      },
    });
    if (!ret) throw new NotFoundException('Return not found');
    return ret;
  }
}
