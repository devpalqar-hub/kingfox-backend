import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Kingfox Summer Lucky Draw 2025', description: 'Campaign display name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Participate and win exciting prizes this summer!', description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 500, description: 'Maximum total vouchers that can be issued', minimum: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  totalVouchersLimit: number;

  @ApiProperty({ example: '2025-04-01', description: 'Campaign start date (ISO 8601)' })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-07-31', description: 'Campaign end date (ISO 8601)' })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}

export class IssueVoucherDto {
  @ApiProperty({ example: 1, description: 'Customer ID receiving the voucher' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  customerId: number;

  @ApiProperty({ example: 1, description: 'Branch ID where voucher is being issued' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  branchId: number;

  @ApiProperty({ example: 6, description: 'User ID of staff issuing the voucher' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  issuedBy: number;

  @ApiPropertyOptional({ example: 1, description: 'Related invoice ID (if issued upon purchase)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  invoiceId?: number;
}
