import { IsUUID } from 'class-validator';

export class EnterGiveawayDto {
  @IsUUID()
  giveawayId: string;

  @IsUUID()
  giftId: string;
}
