import { IsUUID } from 'class-validator';

export class CreateAuctionDto {
  @IsUUID()
  itemId: string;
}
