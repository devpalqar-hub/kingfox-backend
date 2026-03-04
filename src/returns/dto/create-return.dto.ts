import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ReturnType } from '@prisma/client';
import { Type } from 'class-transformer';

export class ReturnItemDto {
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
  refundAmount: number;
}

export class CreateReturnDto {
  @IsNotEmpty()
  @IsEnum(ReturnType)
  returnType: ReturnType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  invoiceId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  onlineOrderId?: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  branchId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customerId?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}
