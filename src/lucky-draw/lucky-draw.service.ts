import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto, IssueVoucherDto } from './dto/lucky-draw.dto';

@Injectable()
export class LuckyDrawService {
  constructor(private prisma: PrismaService) {}

  createCampaign(dto: CreateCampaignDto) {
    return this.prisma.luckyDrawCampaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        totalVouchersLimit: dto.totalVouchersLimit,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  findAllCampaigns(status?: string) {
    return this.prisma.luckyDrawCampaign.findMany({
      where: status ? { status: status as any } : undefined,
      include: { _count: { select: { vouchers: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCampaign(id: number) {
    const campaign = await this.prisma.luckyDrawCampaign.findUnique({
      where: { id: BigInt(id) },
      include: { vouchers: { include: { customer: true, branch: true } } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async updateCampaignStatus(id: number, status: string) {
    await this.findCampaign(id);
    return this.prisma.luckyDrawCampaign.update({
      where: { id: BigInt(id) },
      data: { status: status as any },
    });
  }

  async issueVoucher(campaignId: number, dto: IssueVoucherDto) {
    const campaign = await this.findCampaign(campaignId);
    if (campaign.status !== 'ACTIVE') throw new BadRequestException('Campaign is not active');
    if (campaign.vouchersIssued >= campaign.totalVouchersLimit) {
      throw new BadRequestException('Voucher limit reached for this campaign');
    }

    const voucherCode = `VCH-${campaignId}-${Date.now()}`;

    const voucher = await this.prisma.$transaction(async (tx) => {
      const v = await tx.voucher.create({
        data: {
          voucherCode,
          campaignId: BigInt(campaignId),
          customerId: BigInt(dto.customerId),
          branchId: BigInt(dto.branchId),
          issuedBy: BigInt(dto.issuedBy),
          invoiceId: dto.invoiceId ? BigInt(dto.invoiceId) : null,
        },
      });
      await tx.luckyDrawCampaign.update({
        where: { id: BigInt(campaignId) },
        data: { vouchersIssued: { increment: 1 } },
      });
      return v;
    });

    return voucher;
  }

  findVouchers(campaignId?: number, customerId?: number) {
    return this.prisma.voucher.findMany({
      where: {
        ...(campaignId ? { campaignId: BigInt(campaignId) } : {}),
        ...(customerId ? { customerId: BigInt(customerId) } : {}),
      },
      include: { campaign: true, customer: true, branch: true },
      orderBy: { issuedAt: 'desc' },
    });
  }
}
