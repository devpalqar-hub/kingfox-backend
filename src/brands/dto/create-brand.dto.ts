import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'FoxStyle', description: 'Brand name (must be unique)' })
  @IsNotEmpty()
  @IsString()
  name: string;
}
