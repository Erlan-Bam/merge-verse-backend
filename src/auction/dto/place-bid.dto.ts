import { IsNumber, IsUUID } from 'class-validator';

export class PlaceBidDto {
  @IsUUID()
  auctionId: string;

  @IsNumber()
  amount: number;
}
