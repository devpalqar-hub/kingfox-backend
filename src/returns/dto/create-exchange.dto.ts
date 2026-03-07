import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ExchangeReturnItemDto {
  @ApiProperty({ example: 3, description: 'Variant ID being returned from the original invoice' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  variantId: number;

  @ApiProperty({ example: 1, description: 'Quantity being returned', minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class ExchangeNewItemDto {
  @ApiProperty({ example: 7, description: 'Variant ID the customer is receiving (new item)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  variantId: number;

  @ApiProperty({ example: 1, description: 'Quantity of the new item', minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateExchangeDto {
  @ApiProperty({ example: 42, description: 'Original invoice ID to return items from' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  invoiceId: number;

  @ApiPropertyOptional({ example: 'Wrong size', description: 'Reason for the exchange' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    type: [ExchangeReturnItemDto],
    description: 'Items being returned from the original invoice',
    example: [{ variantId: 3, quantity: 1 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExchangeReturnItemDto)
  returnItems: ExchangeReturnItemDto[];

  @ApiProperty({
    type: [ExchangeNewItemDto],
    description: 'New items the customer is taking in exchange',
    example: [{ variantId: 7, quantity: 1 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExchangeNewItemDto)
  exchangeItems: ExchangeNewItemDto[];

  @ApiProperty({ example: 'CASH', description: 'Payment method if customer needs to pay a difference: CASH | UPI | CARD | CREDIT' })
  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'FOXYDEAL', description: 'Coupon code to apply on the exchange invoice (optional)' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'GST percentage to apply on the exchange bill. Defaults to 0.',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  gstPercent?: number;
}
