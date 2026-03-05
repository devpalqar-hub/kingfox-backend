import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Classic Cotton Tee', description: 'Product name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Premium 100% cotton round-neck T-shirt, pre-shrunk and color-fast.', description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Brand ID (from /brands)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  brandId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Category ID (from /categories)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoryId?: number;
}
