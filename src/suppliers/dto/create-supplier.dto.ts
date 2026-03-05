import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Coimbatore Textile Mills', description: 'Supplier company name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '0422-2345678', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'supply@ctm.in', description: 'Supplier email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '12, Industrial Estate, Coimbatore - 641001', description: 'Postal address' })
  @IsOptional()
  @IsString()
  address?: string;
}
