import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';

@Injectable()
export class ShipmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShipmentDto) {
    let trackingUrl = dto.trackingUrl;

    // Auto-build tracking URL if template is available and tracking ID is present
    if (!trackingUrl && dto.trackingId) {
      const agent = await this.prisma.deliveryAgent.findUnique({
        where: { id: BigInt(dto.deliveryAgentId) },
      });
      if (agent?.trackingUrlTemplate) {
        trackingUrl = agent.trackingUrlTemplate.replace('{trackingId}', dto.trackingId);
      }
    }

    const shipment = await this.prisma.shipment.create({
      data: {
        onlineOrderId: BigInt(dto.onlineOrderId),
        deliveryAgentId: BigInt(dto.deliveryAgentId),
        createdBy: BigInt(dto.createdBy),
        trackingId: dto.trackingId,
        trackingUrl,
        shippedAt: new Date(),
      },
      include: { deliveryAgent: true, onlineOrder: true },
    });

    return shipment;
  }

  findAll(onlineOrderId?: number) {
    return this.prisma.shipment.findMany({
      where: onlineOrderId ? { onlineOrderId: BigInt(onlineOrderId) } : undefined,
      include: { deliveryAgent: true, onlineOrder: true, creator: { select: { id: true, name: true } } },
      orderBy: { shippedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: BigInt(id) },
      include: {
        deliveryAgent: true,
        onlineOrder: { include: { customer: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  async markDelivered(id: number) {
    await this.findOne(id);
    return this.prisma.shipment.update({
      where: { id: BigInt(id) },
      data: { deliveredAt: new Date() },
    });
  }
}
