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
  // ── Customer (identified by phone) ────────────────────────────────────────
  @ApiProperty({ example: '9901234567', description: "Customer's mobile number — used to find or create the customer" })
  @IsNotEmpty()
  @IsString()
  customerPhone: string;

  @ApiPropertyOptional({ example: 'Arjun Kumar', description: 'Required when the phone number is new' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: 'arjun@email.com' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ example: 'Porur, Chennai - 600116' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  // ── Discount ──────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 'FOXYDEAL', description: 'Coupon code to apply discount' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  // ── Vouchers (Lucky Draw) ────────────────────────────────────────────────
  @ApiPropertyOptional({
    example: ['VCH-1-1740000000001', 'VCH-1-1740000000002'],
    description: 'Lucky draw voucher codes to redeem against this invoice.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  voucherCodes?: string[];

  // ── Payment ───────────────────────────────────────────────────────────────
  @ApiProperty({ example: 'CASH', description: 'Payment method: CASH | UPI | CARD | CREDIT' })
  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  // ── Tax / GST ─────────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    example: 5,
    description: 'GST percentage on the discounted subtotal. Defaults to 0.',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  gstPercent?: number;

  // ── Items ─────────────────────────────────────────────────────────────────
  @ApiProperty({
    type: [CheckoutItemDto],
    description: 'Items being sold — use prices from /billing/preview',
    example: [{ variantId: 1, quantity: 2, price: 350 }, { variantId: 5, quantity: 1, price: 950 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];
}
