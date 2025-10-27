import { Rarity } from '@prisma/client';

export type GetRandomGifts = {
  rarity: Rarity;
  amount: number;
};
