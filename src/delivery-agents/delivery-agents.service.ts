import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryAgentDto } from './dto/create-delivery-agent.dto';

@Injectable()
export class DeliveryAgentsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateDeliveryAgentDto) {
    return this.prisma.deliveryAgent.create({ data: dto });
  }

  findAll(activeOnly?: boolean) {
    return this.prisma.deliveryAgent.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const agent = await this.prisma.deliveryAgent.findUnique({ where: { id: BigInt(id) } });
    if (!agent) throw new NotFoundException('Delivery agent not found');
    return agent;
  }

  async update(id: number, dto: Partial<CreateDeliveryAgentDto>) {
    await this.findOne(id);
    return this.prisma.deliveryAgent.update({ where: { id: BigInt(id) }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.deliveryAgent.delete({ where: { id: BigInt(id) } });
  }
}
