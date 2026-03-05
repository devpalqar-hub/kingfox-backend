import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class OtpVerifyDto {
  @ApiProperty({ example: 'admin@kingfox.com', description: 'Email address the OTP was sent to' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '483921', description: '6-digit OTP received via email' })
  @IsString()
  @IsNotEmpty()
  otp: string;
}
