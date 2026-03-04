import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OnlineOrderItemDto {
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
  price: number;
}

export class CreateOnlineOrderDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  customerId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  warehouseBranchId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tax?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnlineOrderItemDto)
  items: OnlineOrderItemDto[];
}
