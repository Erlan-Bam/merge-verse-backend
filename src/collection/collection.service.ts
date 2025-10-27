import { HttpException, Injectable, Logger } from '@nestjs/common';
import { HorizontalPrice, Level, Rarity, VerticalPrice } from '@prisma/client';
import { GiftService } from 'src/gift/gift.service';
import { PrismaService } from 'src/shared/services/prisma.service';

@Injectable()
export class CollectionService {
  private vertical: VerticalPrice[] = [];
  private horizontal: HorizontalPrice[] = [];
  private readonly logger = new Logger(CollectionService.name);
  constructor(
    private giftService: GiftService,
    private prisma: PrismaService,
  ) {
    this.setPrices().catch((error) => {
      this.logger.error(error);
    });
  }

  private async setPrices(): Promise<void> {
    try {
      this.vertical = await this.prisma.verticalPrice.findMany();
      this.horizontal = await this.prisma.horizontalPrice.findMany();
    } catch (error) {
      this.logger.error('Failed to get price data: ', error);
    }
  }

  async getCollection(userId: string) {
    try {
      const collection = await this.giftService.getUserGifts(userId);

      return { collection: collection };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to get collection: ', error);
      throw error;
    }
  }

  async checkCollection(userId: string) {
    if (this.vertical.length === 0 || this.horizontal.length === 0) {
      await this.setPrices();
    }
    try {
      const collection = await this.giftService.getUserGifts(userId);
      const gifts = await this.giftService.getAllGifts();

      const result: {
        vertical: { isComplete: boolean; level: Level; price: number }[];
        horizontal: {
          isComplete: boolean;
          name: string;
          rarity: Rarity;
          price: number;
        }[];
      } = {
        vertical: [],
        horizontal: [],
      };

      for (const data of this.vertical) {
        const giftsOfLevel = new Set(
          collection
            .filter((i) => i.level === data.level)
            .map((g) => g.gift.id),
        );
        result.vertical.push({
          isComplete: giftsOfLevel.size === gifts.length,
          level: data.level,
          price: data.price.toNumber(),
        });
      }

      for (const data of this.horizontal) {
        const levelsForGift = new Set(
          collection
            .filter(
              (i) =>
                i.level !== Level.L0 &&
                i.gift.name === data.name &&
                i.gift.rarity === data.rarity,
            )
            .map((i) => i.level),
        );
        result.horizontal.push({
          isComplete: levelsForGift.size === this.vertical.length,
          name: data.name,
          rarity: data.rarity,
          price: data.price.toNumber(),
        });
      }

      return {
        result: {
          ...result,
          isFull:
            result.vertical.every((v) => v.isComplete) &&
            result.horizontal.every((h) => h.isComplete),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to check collection: ', error);
      throw error;
    }
  }
}
