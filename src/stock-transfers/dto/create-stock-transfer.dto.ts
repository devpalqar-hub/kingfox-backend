import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { TransferStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class StockTransferItemDto {
  @ApiProperty({ example: 2, description: 'Variant ID to transfer' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  variantId: number;

  @ApiProperty({ example: 20, description: 'Number of units to transfer', minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateStockTransferDto {
  @ApiProperty({ example: 2, description: 'Source branch ID (typically the warehouse)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  fromBranchId: number;

  @ApiProperty({ example: 1, description: 'Destination branch ID (shop receiving the stock)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  toBranchId: number;

  @ApiProperty({
    type: [StockTransferItemDto],
    description: 'Items and quantities to transfer',
    example: [
      { variantId: 2, quantity: 20 },
      { variantId: 5, quantity: 10 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockTransferItemDto)
  items: StockTransferItemDto[];
}
