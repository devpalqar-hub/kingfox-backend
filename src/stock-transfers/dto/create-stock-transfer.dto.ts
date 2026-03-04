import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { TransferStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class StockTransferItemDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  variantId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateStockTransferDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  fromBranchId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  toBranchId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockTransferItemDto)
  items: StockTransferItemDto[];
}
