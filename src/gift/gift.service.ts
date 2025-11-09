import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Gift, Level, Price, Rarity } from '@prisma/client';
import { PrismaService } from 'src/shared/services/prisma.service';
import { GetRandomGifts } from './dto/get-random-gifts.dto';

@Injectable()
export class GiftService {
  private readonly logger = new Logger(GiftService.name);
  private gifts: Gift[] = [];
  private prices: Price[] = [];
  constructor(private prisma: PrismaService) {
    this.setGifts().catch((error) => {
      this.logger.error(error);
    });
    this.setPrices().catch((error) => {
      this.logger.error(error);
    });
  }

  private async setGifts(): Promise<void> {
    await this.prisma.ensureConnected();
    try {
      this.gifts = await this.prisma.gift.findMany();
    } catch (error) {
      this.logger.error('Failed to get all gifts: ', error);
    }
  }

  private async setPrices(): Promise<void> {
    await this.prisma.ensureConnected();
    try {
      this.prices = await this.prisma.price.findMany();
    } catch (error) {
      this.logger.error('Failed to get all prices: ', error);
    }
  }

  private async getByRarity(rarity: Rarity) {
    if (!this.gifts || this.gifts.length === 0) {
      await this.setGifts();
    }

    return this.gifts.filter((g) => g.rarity === rarity);
  }

  private getRandomItems<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  async getRandomGiftsByRarity(query: GetRandomGifts) {
    const giftsByRarity = await this.getByRarity(query.rarity);

    return this.getRandomItems(giftsByRarity, query.amount);
  }

  async getGiftPrice(rarity: Rarity, level: Level) {
    const instance = this.prices.find(
      (p) => p.rarity === rarity && p.level === level,
    );
    return instance.price;
  }

  async getAllGifts() {
    try {
      if (!this.gifts || this.gifts.length === 0) {
        await this.setGifts();
      }
      return this.gifts;
    } catch (error) {
      this.logger.error('Failed to get all gifts: ', error);
      throw error;
    }
  }

  async getUserGifts(userId: string) {
    try {
      const collection = await this.prisma.item.findMany({
        where: { userId: userId },
        select: {
          id: true,
          quantity: true,
          level: true,
          isTradeable: true,
          gift: {
            select: {
              id: true,
              rarity: true,
              name: true,
              url: true,
            },
          },
        },
      });

      return collection;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to get user gifts: ', error);
      throw error;
    }
  }
}
