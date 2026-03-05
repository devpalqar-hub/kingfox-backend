import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class PreviewItemDto {
  @ApiProperty({ example: 1, description: 'Variant ID to add to the bill' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  variantId: number;

  @ApiProperty({ example: 2, description: 'Number of units', minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class BillingPreviewDto {
  @ApiProperty({ example: 1, description: 'Shop branch ID (must be type SHOP)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  branchId: number;

  @ApiProperty({
    type: [PreviewItemDto],
    description: 'Items to include in the bill preview',
    example: [
      { variantId: 1, quantity: 2 },
      { variantId: 5, quantity: 1 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviewItemDto)
  items: PreviewItemDto[];

  @ApiPropertyOptional({ example: 'FOXYDEAL', description: 'Coupon code to apply' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: 'VKFX-20250001', description: 'Voucher code to apply' })
  @IsOptional()
  @IsString()
  voucherCode?: string;
}
