import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Ravi Kumar', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ravi.kumar@kingfox.com', description: 'Unique email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'SecurePass@123', description: 'Minimum 8 characters', minLength: 8 })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'Mobile number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'manager', description: 'Role name: admin | manager | staff | cashier' })
  @IsString()
  @IsNotEmpty()
  role: string;
}
