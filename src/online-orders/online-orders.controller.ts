import {
  Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UseGuards,
} from '@nestjs/common';
import { OnlineOrdersService } from './online-orders.service';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Online Orders')
@ApiBearerAuth('access-token')

@UseGuards(JwtAuthGuard)
@Controller('online-orders')
export class OnlineOrdersController {
  constructor(private readonly onlineOrdersService: OnlineOrdersService) {}

  @Post()
  create(@Body() dto: CreateOnlineOrderDto) {
    return this.onlineOrdersService.create(dto);
  }

  @Get()
  findAll(@Query('status') status?: string, @Query('customerId') customerId?: string) {
    return this.onlineOrdersService.findAll(status, customerId ? +customerId : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.onlineOrdersService.findOne(id);
  }

  @Patch(':id/advance')
  advance(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId') userId: number,
  ) {
    return this.onlineOrdersService.advance(id, userId);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.onlineOrdersService.cancel(id);
  }
}
