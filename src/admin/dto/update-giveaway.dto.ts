import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { GiveawayStatus } from '@prisma/client';

export class UpdateGiveawayDto {
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsEnum(GiveawayStatus)
  status?: GiveawayStatus;
}
