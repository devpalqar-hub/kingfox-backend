import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BranchType } from '@prisma/client';

export class CreateBranchDto {
  @ApiProperty({ example: 'Anna Nagar Branch', description: 'Branch display name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'Branch contact number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '45, Anna Nagar, Chennai - 600040', description: 'Physical address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ enum: BranchType, example: BranchType.SHOP, description: 'SHOP or WAREHOUSE' })
  @IsNotEmpty()
  @IsEnum(BranchType)
  type: BranchType;
}
