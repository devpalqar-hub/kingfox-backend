import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OnlineOrderItemDto {
  @ApiProperty({ example: 3, description: 'Variant ID (from /products/:id/variants)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  variantId: number;

  @ApiProperty({ example: 1, description: 'Number of units ordered', minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 1200, description: 'Selling price per unit at time of order (₹)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  price: number;
}

export class CreateOnlineOrderDto {
  @ApiProperty({ example: 5, description: 'Customer ID placing the order' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  customerId: number;

  @ApiProperty({ example: 2, description: 'Warehouse branch ID that will fulfil the order' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  warehouseBranchId: number;

  @ApiPropertyOptional({ example: 18, description: 'Tax percentage (e.g., 18 for 18% GST)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tax?: number;

  @ApiPropertyOptional({ example: 0, description: 'Flat discount amount in ₹', default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discount?: number;

  @ApiPropertyOptional({ example: 'RAZORPAY', description: 'Payment method: RAZORPAY | COD | BANK_TRANSFER' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({
    type: [OnlineOrderItemDto],
    description: 'Items in the online order',
    example: [
      { variantId: 3, quantity: 1, price: 1200 },
      { variantId: 7, quantity: 2, price: 600 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnlineOrderItemDto)
  items: OnlineOrderItemDto[];
}
