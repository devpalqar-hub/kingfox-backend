import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';

@Injectable()
export class StockTransfersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStockTransferDto) {
    if (dto.fromBranchId === dto.toBranchId) {
      throw new BadRequestException('Source and destination branches must be different');
    }
    return this.prisma.stockTransfer.create({
      data: {
        fromBranchId: BigInt(dto.fromBranchId),
        toBranchId: BigInt(dto.toBranchId),
        items: {
          create: dto.items.map((item) => ({
            variantId: BigInt(item.variantId),
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true, fromBranch: true, toBranch: true },
    });
  }

  findAll(status?: string) {
    return this.prisma.stockTransfer.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        fromBranch: true,
        toBranch: true,
        items: { include: { variant: { include: { product: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: BigInt(id) },
      include: {
        fromBranch: true,
        toBranch: true,
        items: { include: { variant: { include: { product: true } } } },
      },
    });
    if (!transfer) throw new NotFoundException('Stock transfer not found');
    return transfer;
  }

  async approve(id: number) {
    const transfer = await this.findOne(id);
    if (transfer.status !== 'PENDING') throw new BadRequestException('Only PENDING transfers can be approved');
    return this.prisma.stockTransfer.update({ where: { id: BigInt(id) }, data: { status: 'APPROVED' } });
  }

  async complete(id: number) {
    const transfer = await this.findOne(id);
    if (transfer.status !== 'APPROVED') throw new BadRequestException('Only APPROVED transfers can be completed');

    await this.prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        // Deduct from source
        await tx.inventory.upsert({
          where: { variantId_branchId: { variantId: item.variantId, branchId: transfer.fromBranchId } },
          update: { stockQuantity: { decrement: item.quantity } },
          create: { variantId: item.variantId, branchId: transfer.fromBranchId, stockQuantity: 0 },
        });
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            branchId: transfer.fromBranchId,
            type: 'TRANSFER_OUT',
            quantity: -item.quantity,
            referenceId: BigInt(id),
          },
        });

        // Add to destination
        await tx.inventory.upsert({
          where: { variantId_branchId: { variantId: item.variantId, branchId: transfer.toBranchId } },
          update: { stockQuantity: { increment: item.quantity } },
          create: { variantId: item.variantId, branchId: transfer.toBranchId, stockQuantity: item.quantity },
        });
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            branchId: transfer.toBranchId,
            type: 'TRANSFER_IN',
            quantity: item.quantity,
            referenceId: BigInt(id),
          },
        });
      }

      await tx.stockTransfer.update({ where: { id: BigInt(id) }, data: { status: 'COMPLETED' } });
    });

    return this.findOne(id);
  }
}
