import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, Min,
} from 'class-validator';
import { DiscountType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER25', description: 'Unique coupon code (uppercase, no spaces)' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Get 25% off on orders above ₹1000', description: 'Human-readable description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE, description: 'PERCENTAGE or FIXED amount discount' })
  @IsNotEmpty()
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({ example: 25, description: 'Discount value — percentage (25 = 25%) or flat ₹ amount' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  discountValue: number;

  @ApiPropertyOptional({ example: 1000, description: 'Minimum cart value required to apply coupon (₹)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPurchaseAmount?: number;

  @ApiPropertyOptional({ example: 500, description: 'Cap on discount amount for PERCENTAGE type (₹)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 200, description: 'Maximum number of times this coupon can be used', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  usageLimit?: number;

  @ApiPropertyOptional({ example: '2025-04-01', description: 'Coupon validity start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-09-30', description: 'Coupon validity end date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
