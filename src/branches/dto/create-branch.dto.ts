import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BranchType } from '@prisma/client';

export class CreateBranchDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsNotEmpty()
  @IsEnum(BranchType)
  type: BranchType;
}
