import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Six-digit verification code sent to the email address',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: 'Verification code must be a string' })
  @IsNotEmpty({ message: 'Verification code is required' })
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must contain only digits' })
  code: string;
}
