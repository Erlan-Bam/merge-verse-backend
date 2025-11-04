import { Provider } from '@prisma/client';
import { IsEnum, IsNumber } from 'class-validator';

export class CreateInvoiceDto {
  @IsNumber()
  amount: number;

  @IsEnum(Provider)
  provider: Provider;
}
