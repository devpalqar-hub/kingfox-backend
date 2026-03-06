import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// ── Scan Item ─────────────────────────────────────────────────────────────────

export class ScanItemDto {
  @ApiProperty({ example: '8901234501001', description: 'Barcode of the product to scan into the cart' })
  @IsNotEmpty()
  @IsString()
  barcode: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'GST percentage (e.g. 5 for 5%). Stored on first scan; subsequent scans use the stored value. Defaults to 0.',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  gstPercent?: number;
}

// ── Update Item Quantity ───────────────────────────────────────────────────────

export class UpdateItemQtyDto {
  @ApiProperty({
    example: 3,
    description: 'New quantity. Send 0 to remove the item entirely.',
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity: number;
}

// ── Cart Checkout ──────────────────────────────────────────────────────────────

export class CartCheckoutDto {
  @ApiProperty({ example: 'CASH', description: 'Payment method: CASH | UPI | CARD | CREDIT' })
  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  // Customer (optional — walk-in if omitted)
  @ApiPropertyOptional({ example: '9901234567', description: "Customer's mobile number" })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'Arjun Kumar', description: 'Required only when the phone number is new to the system' })
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

  // Discount
  @ApiPropertyOptional({ example: 'FOXYDEAL', description: 'Coupon code to apply discount' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  // Lucky draw vouchers
  @ApiPropertyOptional({
    example: ['VCH-1-1740000000001', 'VCH-1-1740000000002'],
    description: 'Lucky draw voucher codes to redeem against this invoice.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  voucherCodes?: string[];
}
