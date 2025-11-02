import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateGiveawayDto {
  @IsUUID()
  giftId: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
