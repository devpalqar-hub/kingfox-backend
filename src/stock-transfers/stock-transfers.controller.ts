import {
  Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UseGuards,
} from '@nestjs/common';
import { StockTransfersService } from './stock-transfers.service';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Stock Transfers')
@ApiBearerAuth('access-token')

@UseGuards(JwtAuthGuard)
@Controller('stock-transfers')
export class StockTransfersController {
  constructor(private readonly stockTransfersService: StockTransfersService) {}

  @Post()
  create(@Body() dto: CreateStockTransferDto) {
    return this.stockTransfersService.create(dto);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.stockTransfersService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stockTransfersService.findOne(id);
  }

  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.stockTransfersService.approve(id);
  }

  @Patch(':id/complete')
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.stockTransfersService.complete(id);
  }
}
