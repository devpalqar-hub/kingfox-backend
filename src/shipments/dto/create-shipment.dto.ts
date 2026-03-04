import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShipmentDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  onlineOrderId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  deliveryAgentId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  createdBy: number;

  @IsOptional()
  @IsString()
  trackingId?: string;

  @IsOptional()
  @IsString()
  trackingUrl?: string;
}
