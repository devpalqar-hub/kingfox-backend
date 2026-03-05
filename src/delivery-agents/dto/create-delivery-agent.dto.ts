import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDeliveryAgentDto {
  @ApiProperty({ example: 'BlueDart', description: 'Courier company / delivery agent name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Suresh Nair', description: 'Primary contact person at the courier company' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ example: '9822334455', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'support@bluedart.com', description: 'Contact email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'https://www.bluedart.com/web/guest/trackdartship?TrackNo={tracking_id}',
    description: 'URL template for shipment tracking — use {tracking_id} as placeholder',
  })
  @IsOptional()
  @IsString()
  trackingUrlTemplate?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether this agent is currently active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
