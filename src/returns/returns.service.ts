import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReturnDto) {
    const totalRefund = dto.items.reduce((sum, item) => sum + item.refundAmount, 0);

    const result = await this.prisma.$transaction(async (tx) => {
      const ret = await tx.return.create({
        data: {
          returnType: dto.returnType,
          invoiceId: dto.invoiceId ? BigInt(dto.invoiceId) : null,
          onlineOrderId: dto.onlineOrderId ? BigInt(dto.onlineOrderId) : null,
          branchId: BigInt(dto.branchId),
          customerId: dto.customerId ? BigInt(dto.customerId) : null,
          totalRefund,
          reason: dto.reason,
          items: {
            create: dto.items.map((item) => ({
              variantId: BigInt(item.variantId),
              quantity: item.quantity,
              refundAmount: item.refundAmount,
            })),
          },
        },
        include: { items: true },
      });

      // Restore stock
      for (const item of dto.items) {
        await tx.inventory.upsert({
          where: { variantId_branchId: { variantId: BigInt(item.variantId), branchId: BigInt(dto.branchId) } },
          update: { stockQuantity: { increment: item.quantity } },
          create: { variantId: BigInt(item.variantId), branchId: BigInt(dto.branchId), stockQuantity: item.quantity },
        });
        await tx.stockMovement.create({
          data: {
            variantId: BigInt(item.variantId),
            branchId: BigInt(dto.branchId),
            type: 'RETURN',
            quantity: item.quantity,
            referenceId: ret.id,
          },
        });
      }

      // Update invoice status if applicable
      if (dto.invoiceId) {
        await tx.invoice.update({
          where: { id: BigInt(dto.invoiceId) },
          data: { status: 'RETURNED' },
        });
      }

      return ret;
    });

    return this.findOne(Number(result.id));
  }

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
      },
    });
    if (!ret) throw new NotFoundException('Return not found');
    return ret;
  }
}
