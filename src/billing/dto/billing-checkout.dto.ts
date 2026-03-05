import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CheckoutItemDto {
  @ApiProperty({ example: 1, description: 'Variant ID' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  variantId: number;

  @ApiProperty({ example: 2, description: 'Quantity sold', minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 350, description: 'Agreed selling price per unit (₹) — from preview response' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  price: number;
}

export class BillingCheckoutDto {
  @ApiProperty({ example: 1, description: 'Shop branch ID' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  branchId: number;

  @ApiProperty({ example: 6, description: 'Cashier / biller User ID (logged-in user)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @ApiPropertyOptional({ example: 1, description: 'Customer ID — omit for walk-in customers' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customerId?: number;

  @ApiPropertyOptional({ example: 'FOXYDEAL', description: 'Coupon code to apply discount' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: 'VKFX-20250001', description: 'Voucher code from lucky draw' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiProperty({ example: 'CASH', description: 'Payment method: CASH | UPI | CARD | CREDIT' })
  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 18, description: 'Tax percentage (e.g. 18 for 18% GST)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tax?: number;

  @ApiProperty({
    type: [CheckoutItemDto],
    description: 'Items being sold — use prices confirmed from /billing/preview',
    example: [
      { variantId: 1, quantity: 2, price: 350 },
      { variantId: 5, quantity: 1, price: 950 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];
}
