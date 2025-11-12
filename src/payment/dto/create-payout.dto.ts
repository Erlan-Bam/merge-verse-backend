import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePayoutDto {
  @ApiProperty({
    description: 'Verification code for payout authorization',
    example: '123456',
    type: String,
  })
  @IsString()
  code: string;
}
