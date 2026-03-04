import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

  async create(dto: CreatePurchaseOrderDto) {
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.costPrice,
      0,
    );

    return this.prisma.purchaseOrder.create({
      data: {
        supplierId: dto.supplierId,
        branchId: dto.branchId,
        totalAmount,
        status: dto.status || 'PENDING',
        items: {
          create: dto.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            costPrice: item.costPrice,
          })),
        },
      },
      include: { items: { include: { variant: true } }, supplier: true, branch: true },
    });
  }

  findAll(branchId?: number, supplierId?: number, status?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(status ? { status } : {}),
      },
      include: { supplier: true, branch: true, items: { include: { variant: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: true,
        items: { include: { variant: { include: { product: true } } } },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async receive(id: number) {
    const po = await this.findOne(id);
    if (po.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING orders can be received');
    }

    await this.prisma.$transaction(async (tx) => {
      // Update each inventory item
      for (const item of po.items) {
        await this.inventoryService.adjustStock(
          Number(item.variantId),
          Number(po.branchId),
          item.quantity,
          'PURCHASE_RECEIVED',
          id,
        );
      }

      await tx.purchaseOrder.update({ where: { id }, data: { status: 'RECEIVED' } });
    });

    return this.findOne(id);
  }

  async cancel(id: number) {
    const po = await this.findOne(id);
    if (po.status === 'RECEIVED') {
      throw new BadRequestException('Cannot cancel a received order');
    }
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
