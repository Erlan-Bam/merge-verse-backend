import { Level, Rarity } from '@prisma/client';
import { PackConfig, PackType } from '../types/pack.types';

export const Pack: Record<PackType, PackConfig> = {
  FREE_DAILY: {
    price: 0,
    level: Level.L0,
    total: 10,
    tradeable: false,
    composition: {
      [Rarity.COMMON]: 7,
      [Rarity.RARE]: 2,
      [Rarity.EPIC]: 1,
    },
  },

  FREE_STREAK: {
    price: 0,
    level: Level.L0,
    total: 15,
    tradeable: false,
    composition: {
      [Rarity.COMMON]: 9,
      [Rarity.RARE]: 4,
      [Rarity.EPIC]: 2,
    },
  },

  COMMON_PACK: {
    price: 0.7,
    level: Level.L1,
    total: 15,
    tradeable: true,
    composition: {
      [Rarity.COMMON]: 10,
      [Rarity.RARE]: 5,
    },
  },

  RARE_PACK: {
    price: 1.4,
    level: Level.L1,
    total: 15,
    tradeable: true,
    composition: {
      [Rarity.RARE]: 12,
      [Rarity.EPIC]: 3,
    },
  },

  EPIC_PACK: {
    price: 4.0,
    level: Level.L1,
    total: 15,
    tradeable: true,
    composition: {
      [Rarity.EPIC]: 13,
      [Rarity.LEGENDARY]: 2,
    },
  },

  LEGENDARY_PACK: {
    price: 13.0,
    level: Level.L1,
    total: 15,
    tradeable: true,
    composition: {
      [Rarity.LEGENDARY]: 14,
      [Rarity.MYTHIC]: 1,
    },
  },
};
