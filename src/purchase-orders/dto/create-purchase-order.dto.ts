import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderItemDto {
  @ApiProperty({ example: 1, description: 'Variant ID (from /products/:id/variants)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  variantId: number;

  @ApiProperty({ example: 50, description: 'Number of units ordered', minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 150, description: 'Cost price per unit at time of purchase (₹)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  costPrice: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: 1, description: 'Supplier ID (from /suppliers)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  supplierId: number;

  @ApiProperty({ example: 2, description: 'Receiving branch/warehouse ID' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  branchId: number;

  @ApiPropertyOptional({ example: 'PENDING', description: 'Order status: PENDING | RECEIVED | CANCELLED', default: 'PENDING' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    type: [PurchaseOrderItemDto],
    description: 'Line items in the purchase order',
    example: [
      { variantId: 1, quantity: 50, costPrice: 150 },
      { variantId: 2, quantity: 30, costPrice: 200 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}
