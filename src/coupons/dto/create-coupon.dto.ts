import {
  IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, Min,
} from 'class-validator';
import { DiscountType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateCouponDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPurchaseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  usageLimit?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
