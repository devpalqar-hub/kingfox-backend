import {
  Controller, Get, Query, UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Inventory')
@ApiBearerAuth('access-token')

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  getInventory(
    @Query('branchId') branchId?: string,
    @Query('variantId') variantId?: string,
  ) {
    return this.inventoryService.getInventory(
      branchId ? +branchId : undefined,
      variantId ? +variantId : undefined,
    );
  }

  @Get('movements')
  getStockMovements(
    @Query('branchId') branchId?: string,
    @Query('variantId') variantId?: string,
    @Query('type') type?: string,
  ) {
    return this.inventoryService.getStockMovements(
      branchId ? +branchId : undefined,
      variantId ? +variantId : undefined,
      type,
    );
  }
}
