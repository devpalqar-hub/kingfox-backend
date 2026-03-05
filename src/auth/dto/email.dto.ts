import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class EmailDto {
  @ApiProperty({ example: 'admin@kingfox.com', description: 'Email address to send OTP / password reset link to' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
