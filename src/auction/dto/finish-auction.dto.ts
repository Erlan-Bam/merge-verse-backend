import { IsUUID } from 'class-validator';

export class FinishAuctionDto {
  @IsUUID()
  auctionId: string;
}
