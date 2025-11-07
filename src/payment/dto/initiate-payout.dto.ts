import { IsNumber } from 'class-validator';

export class InitiatePayoutDto {
  @IsNumber()
  amount: number;
}
