import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'supervisor', description: 'Role name — must be unique (e.g. admin, manager, staff, cashier)' })
  @IsNotEmpty()
  @IsString()
  name: string;
}
