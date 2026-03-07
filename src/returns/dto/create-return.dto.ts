import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ReturnType } from '@prisma/client';
import { Type } from 'class-transformer';

export class ReturnItemDto {
  @ApiProperty({ example: 1, description: 'Variant ID being returned' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  variantId: number;

  @ApiProperty({ example: 1, description: 'Number of units returned', minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateReturnDto {
  @ApiProperty({
    enum: ReturnType,
    example: ReturnType.INVOICE,
    description:
      'INVOICE — full shop return (invoice → RETURNED) | ' +
      'PARTIAL_RETURN — some items returned (invoice → PARTIALLY_RETURNED) | ' +
      'ONLINE_ORDER — e-commerce return',
  })
  @IsNotEmpty()
  @IsEnum(ReturnType)
  returnType: ReturnType;

  @ApiPropertyOptional({ example: 1, description: 'Invoice ID (required for INVOICE / PARTIAL_RETURN)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  invoiceId?: number;

  @ApiPropertyOptional({ example: null, description: 'Online Order ID (required for ONLINE_ORDER)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  onlineOrderId?: number;

  @ApiPropertyOptional({ example: 'Customer received damaged product', description: 'Reason for return' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    type: [ReturnItemDto],
    description: 'Items being returned — refund amount is auto-calculated from the original invoice price',
    example: [{ variantId: 1, quantity: 1 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}
