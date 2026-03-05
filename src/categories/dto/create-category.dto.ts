import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'T-Shirts', description: 'Product category name' })
  @IsNotEmpty()
  @IsString()
  name: string;
}
