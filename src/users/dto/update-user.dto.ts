import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Priya Sharma', description: "Updated full name" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'priya.sharma@kingfox.com', description: 'Updated email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'NewPass@456', description: 'New password (will be hashed)' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: 3, description: 'New Role ID to assign (1=admin, 2=manager, 3=staff, 4=cashier)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  roleId?: number;

  @ApiPropertyOptional({ example: 2, description: 'New Branch ID to move user to' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  branchId?: number;
}
