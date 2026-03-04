import {
  Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UseGuards,
} from '@nestjs/common';
import { LuckyDrawService } from './lucky-draw.service';
import { CreateCampaignDto, IssueVoucherDto } from './dto/lucky-draw.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Lucky Draw')
@ApiBearerAuth('access-token')

@UseGuards(JwtAuthGuard)
@Controller('lucky-draw')
export class LuckyDrawController {
  constructor(private readonly luckyDrawService: LuckyDrawService) {}

  @Post('campaigns')
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.luckyDrawService.createCampaign(dto);
  }

  @Get('campaigns')
  findAllCampaigns(@Query('status') status?: string) {
    return this.luckyDrawService.findAllCampaigns(status);
  }

  @Get('campaigns/:id')
  findCampaign(@Param('id', ParseIntPipe) id: number) {
    return this.luckyDrawService.findCampaign(id);
  }

  @Patch('campaigns/:id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: string) {
    return this.luckyDrawService.updateCampaignStatus(id, status);
  }

  @Post('campaigns/:id/vouchers')
  issueVoucher(@Param('id', ParseIntPipe) id: number, @Body() dto: IssueVoucherDto) {
    return this.luckyDrawService.issueVoucher(id, dto);
  }

  @Get('vouchers')
  findVouchers(
    @Query('campaignId') campaignId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.luckyDrawService.findVouchers(
      campaignId ? +campaignId : undefined,
      customerId ? +customerId : undefined,
    );
  }
}
