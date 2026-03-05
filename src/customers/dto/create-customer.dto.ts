import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Arjun Mehta', description: "Customer's full name" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '9901234567', description: 'Mobile number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'arjun.mehta@gmail.com', description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Adyar, Chennai - 600020', description: 'Delivery / billing address' })
  @IsOptional()
  @IsString()
  address?: string;
}
