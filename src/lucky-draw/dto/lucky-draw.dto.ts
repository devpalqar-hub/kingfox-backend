import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CampaignStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateCampaignDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  totalVouchersLimit: number;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}

export class IssueVoucherDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  customerId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  branchId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  issuedBy: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  invoiceId?: number;
}
