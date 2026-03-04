import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';

@Injectable()
export class OnlineOrdersService {
  constructor(private prisma: PrismaService) {}

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}`;
  }

  async create(dto: CreateOnlineOrderDto) {
    const subtotal = dto.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const tax = dto.tax ?? 0;
    const discount = dto.discount ?? 0;
    const finalAmount = subtotal + tax - discount;

    const order = await this.prisma.onlineOrder.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        customerId: BigInt(dto.customerId),
        warehouseBranchId: BigInt(dto.warehouseBranchId),
        subtotal,
        tax,
        discount,
        finalAmount,
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

    if (dto.paymentMethod) {
      await this.prisma.onlinePayment.create({
        data: {
          onlineOrderId: order.id,
          paymentMethod: dto.paymentMethod,
          amount: finalAmount,
        },
      });
    }

    return this.findOne(Number(order.id));
  }

  findAll(status?: string, customerId?: number) {
    return this.prisma.onlineOrder.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(customerId ? { customerId: BigInt(customerId) } : {}),
      },
      include: {
        customer: true,
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
        shipments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.onlineOrder.findUnique({
      where: { id: BigInt(id) },
      include: {
        customer: true,
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
        shipments: { include: { deliveryAgent: true } },
        confirmedByUser: { select: { id: true, name: true } },
        packedByUser: { select: { id: true, name: true } },
        shippedByUser: { select: { id: true, name: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private nextStatus(current: string): string {
    const flow: Record<string, string> = {
      PENDING: 'CONFIRMED',
      CONFIRMED: 'PACKED',
      PACKED: 'SHIPPED',
      SHIPPED: 'DELIVERED',
    };
    return flow[current] ?? current;
  }

  async advance(id: number, userId: number) {
    const order = await this.findOne(id);
    const currentStatus = order.status as string;

    if (!['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED'].includes(currentStatus)) {
      throw new BadRequestException(`Cannot advance from status ${currentStatus}`);
    }

    const newStatus = this.nextStatus(currentStatus);
    const userField: Record<string, string> = {
      PENDING: 'confirmedBy',
      CONFIRMED: 'packedBy',
      PACKED: 'shippedBy',
    };
    const field = userField[currentStatus];

    return this.prisma.onlineOrder.update({
      where: { id: BigInt(id) },
      data: {
        status: newStatus as any,
        ...(field ? { [field]: BigInt(userId) } : {}),
      },
    });
  }

  async cancel(id: number) {
    const order = await this.findOne(id);
    if (['DELIVERED', 'CANCELLED'].includes(order.status as string)) {
      throw new BadRequestException('Cannot cancel this order');
    }
    return this.prisma.onlineOrder.update({
      where: { id: BigInt(id) },
      data: { status: 'CANCELLED' },
    });
  }
}
