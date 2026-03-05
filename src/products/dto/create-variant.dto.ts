import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVariantDto {
  @ApiPropertyOptional({ example: 'M', description: 'Size label (S, M, L, XL, 30, 32, ...)' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ example: 'Navy Blue', description: 'Color name' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 'KF-1001', description: 'Unique Stock Keeping Unit code' })
  @IsNotEmpty()
  @IsString()
  sku: string;

  @ApiPropertyOptional({ example: '8901234567890', description: 'EAN-13 barcode (optional)' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 150, description: 'Purchase / cost price in ₹' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  costPrice: number;

  @ApiProperty({ example: 350, description: 'MRP / selling price in ₹' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  sellingPrice: number;
}
