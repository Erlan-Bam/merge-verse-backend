import { IsEnum, IsOptional } from 'class-validator';
import { GiveawayStatus } from '@prisma/client';

export class GetGiveawaysDto {
  @IsOptional()
  @IsEnum(GiveawayStatus)
  status?: GiveawayStatus;
}
