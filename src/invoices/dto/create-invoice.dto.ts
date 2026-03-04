import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  variantId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  price: number;
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customerId?: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  branchId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tax?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
