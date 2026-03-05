import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShipmentDto {
  @ApiProperty({ example: 1, description: 'Online Order ID to ship' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  onlineOrderId: number;

  @ApiProperty({ example: 1, description: 'Delivery Agent ID (courier partner)' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  deliveryAgentId: number;

  @ApiProperty({ example: 4, description: 'User ID of the staff creating the shipment record' })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  createdBy: number;

  @ApiPropertyOptional({ example: 'DTDC987654321', description: 'Courier tracking ID / AWB number' })
  @IsOptional()
  @IsString()
  trackingId?: string;

  @ApiPropertyOptional({ example: 'https://www.dtdc.in/tracking.asp?Trck_no=DTDC987654321', description: 'Direct tracking URL for the shipment' })
  @IsOptional()
  @IsString()
  trackingUrl?: string;
}
