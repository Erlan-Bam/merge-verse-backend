import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class InitiatePayoutDto {
  @ApiProperty({
    description: 'Amount to withdraw from user balance',
    example: 50.0,
    type: Number,
    minimum: 0.01,
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}
