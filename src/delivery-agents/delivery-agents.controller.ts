import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, UseGuards,
} from '@nestjs/common';
import { DeliveryAgentsService } from './delivery-agents.service';
import { CreateDeliveryAgentDto } from './dto/create-delivery-agent.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Delivery Agents')
@ApiBearerAuth('access-token')

@UseGuards(JwtAuthGuard)
@Controller('delivery-agents')
export class DeliveryAgentsController {
  constructor(private readonly deliveryAgentsService: DeliveryAgentsService) {}

  @Post()
  create(@Body() dto: CreateDeliveryAgentDto) {
    return this.deliveryAgentsService.create(dto);
  }

  @Get()
  findAll(@Query('active') active?: string) {
    return this.deliveryAgentsService.findAll(active === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.deliveryAgentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateDeliveryAgentDto>) {
    return this.deliveryAgentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.deliveryAgentsService.remove(id);
  }
}
