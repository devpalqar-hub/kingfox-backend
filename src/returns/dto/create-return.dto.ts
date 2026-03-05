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

  @ApiProperty({ example: 350, description: 'Refund amount per unit (₹)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  refundAmount: number;
}

export class CreateReturnDto {
  @ApiProperty({ enum: ReturnType, example: ReturnType.INVOICE, description: 'INVOICE — shop return | ONLINE_ORDER — e-commerce return' })
  @IsNotEmpty()
  @IsEnum(ReturnType)
  returnType: ReturnType;

  @ApiPropertyOptional({ example: 1, description: 'Invoice ID (required when returnType = INVOICE)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  invoiceId?: number;

  @ApiPropertyOptional({ example: null, description: 'Online Order ID (required when returnType = ONLINE_ORDER)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  onlineOrderId?: number;

  @ApiProperty({ example: 1, description: 'Branch ID where the return is being processed' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  branchId: number;

  @ApiPropertyOptional({ example: 2, description: 'Customer ID (if known)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customerId?: number;

  @ApiPropertyOptional({ example: 'Customer received damaged product', description: 'Reason for return' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    type: [ReturnItemDto],
    description: 'Items being returned',
    example: [{ variantId: 1, quantity: 1, refundAmount: 350 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}
