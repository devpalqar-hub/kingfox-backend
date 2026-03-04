import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  getInventory(branchId?: number, variantId?: number) {
    return this.prisma.inventory.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(variantId ? { variantId } : {}),
      },
      include: {
        branch: true,
        variant: { include: { product: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  getStockMovements(branchId?: number, variantId?: number, type?: string) {
    return this.prisma.stockMovement.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(variantId ? { variantId } : {}),
        ...(type ? { type } : {}),
      },
      include: {
        branch: true,
        variant: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adjustStock(variantId: number, branchId: number, quantity: number, type: string, referenceId?: number) {
    const inv = await this.prisma.inventory.upsert({
      where: { variantId_branchId: { variantId, branchId } },
      update: { stockQuantity: { increment: quantity } },
      create: { variantId, branchId, stockQuantity: Math.max(0, quantity) },
    });
    await this.prisma.stockMovement.create({
      data: { variantId, branchId, type, quantity, referenceId: referenceId ?? null },
    });
    return inv;
  }
}
