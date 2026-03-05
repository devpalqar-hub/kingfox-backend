import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'Priya Sharma', description: "User's full name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'priya.sharma@kingfox.com', description: 'Unique email — used for login' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Secure@Pass123', description: 'Login password (min 8 chars). If omitted, an invite email is sent.' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: 2, description: 'Role ID (1=admin, 2=manager, 3=staff, 4=cashier)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  roleId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Branch ID to assign this user to' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  branchId?: number;
}
