import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Amount to be paid in USD',
    example: 49.99,
  })
  @IsNumber()
  amount: number;
}
