import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderItemDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  variantId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  costPrice: number;
}

export class CreatePurchaseOrderDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  supplierId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  branchId: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}
