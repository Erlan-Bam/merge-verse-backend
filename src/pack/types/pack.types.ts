import { Level, Rarity } from '@prisma/client';

export type PackType =
  | 'FREE_DAILY'
  | 'FREE_STREAK'
  | 'COMMON_PACK'
  | 'RARE_PACK'
  | 'EPIC_PACK'
  | 'LEGENDARY_PACK';

export type PackConfig = {
  price: number;
  level: Level;
  total: number;
  tradeable: boolean;
  composition: Partial<Record<Rarity, number>>;
};
