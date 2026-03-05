import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @ApiProperty({ example: 1, description: 'Variant ID (from /products/:id/variants)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  variantId: number;

  @ApiProperty({ example: 2, description: 'Number of units sold', minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 350, description: 'Selling price per unit at time of billing (₹)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  price: number;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional({ example: 1, description: 'Customer ID — omit for walk-in (cash) customers' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customerId?: number;

  @ApiProperty({ example: 1, description: 'Branch/Shop ID where invoice is being raised' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  branchId: number;

  @ApiProperty({ example: 6, description: 'Cashier / staff User ID raising the invoice' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @ApiPropertyOptional({ example: 'FOXYDEAL', description: 'Discount coupon code (applied at billing)' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: 18, description: 'Tax percentage to apply (e.g., 18 for 18% GST)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tax?: number;

  @ApiPropertyOptional({ example: 'CASH', description: 'Payment method: CASH | UPI | CARD | CREDIT' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({
    type: [InvoiceItemDto],
    description: 'Purchased line items',
    example: [
      { variantId: 1, quantity: 2, price: 350 },
      { variantId: 5, quantity: 1, price: 950 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
