import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Gift, Rarity } from '@prisma/client';
import { PrismaService } from 'src/shared/services/prisma.service';
import { GetRandomGifts } from './dto/get-random-gifts.dto';

@Injectable()
export class GiftService {
  private readonly logger = new Logger(GiftService.name);
  private gifts: Gift[] = [];
  constructor(private prisma: PrismaService) {
    this.setGifts().catch((error) => {
      this.logger.error(error);
    });
  }

  private async setGifts(): Promise<void> {
    try {
      this.gifts = await this.prisma.gift.findMany();
    } catch (error) {
      this.logger.error('Failed to get all gifts: ', error);
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
}
