import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class QuickCustomerDto {
  @ApiProperty({ example: 'Karthik Pillai', description: "Customer's full name" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '9923456789', description: 'Mobile number (used for lookup)' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'karthik.p@gmail.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Porur, Chennai - 600116' })
  @IsOptional()
  @IsString()
  address?: string;
}
