import { Rarity } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class GetGiveawaysWinnerDto {
  @IsOptional()
  @IsEnum(Rarity)
  rarity?: Rarity;

  @IsOptional()
  @IsUUID()
  id?: string;
}
