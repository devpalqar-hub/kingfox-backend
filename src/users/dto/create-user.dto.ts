import { IsEmail, IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  roleId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  branchId?: number;
}
