import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { DiscountType } from '@prisma/client';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Coupon code already exists');
    return this.prisma.coupon.create({ data: dto });
  }

  findAll(active?: boolean) {
    const now = new Date();
    return this.prisma.coupon.findMany({
      where: active
        ? {
            startDate: { lte: now },
            endDate: { gte: now },
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async validate(code: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) throw new BadRequestException('Coupon not yet active');
    if (coupon.endDate && coupon.endDate < now) throw new BadRequestException('Coupon has expired');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      throw new BadRequestException('Coupon usage limit reached');
    if (coupon.minPurchaseAmount && subtotal < Number(coupon.minPurchaseAmount))
      throw new BadRequestException(`Minimum purchase of ${coupon.minPurchaseAmount} required`);

    let discount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discount = (subtotal * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscountAmount && discount > Number(coupon.maxDiscountAmount)) {
        discount = Number(coupon.maxDiscountAmount);
      }
    } else {
      discount = Number(coupon.discountValue);
    }
    return { coupon, discount };
  }

  async update(id: number, dto: Partial<CreateCouponDto>) {
    await this.findOne(id);
    return this.prisma.coupon.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.coupon.delete({ where: { id } });
  }
}
