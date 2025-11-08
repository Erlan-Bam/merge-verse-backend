import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Gift, Level, Rarity } from '@prisma/client';
import { GiftService } from 'src/gift/gift.service';
import { PrismaService } from 'src/shared/services/prisma.service';
import { Pack } from './const/pack.const';
import { PackType } from './types/pack.types';
import { BuyPackDto } from './dto/buy-pack.dto';

@Injectable()
export class PackService {
  private readonly logger = new Logger(PackService.name);
  constructor(
    private prisma: PrismaService,
    private giftService: GiftService,
  ) {}

  async getFreePack(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { streak: true, activeAt: true },
      });

      if (user.activeAt) {
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        const startOfActiveAt = new Date(user.activeAt).setHours(0, 0, 0, 0);

        if (startOfActiveAt === startOfToday) {
          return {
            streak: user.streak,
            pack: [],
          };
        }
      }

      const newStreak = user.streak + 1;
      const isComplete = newStreak >= 7;
      const { pack, config } = await this.getPackByType(
        isComplete ? 'FREE_DAILY' : 'FREE_STREAK',
      );

      const updated = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            activeAt: new Date(),
            streak: isComplete ? 0 : newStreak,
          },
          select: { streak: true },
        });

        await Promise.all(
          pack.map((gift) =>
            tx.item.upsert({
              where: {
                userId_giftId_level_isTradeable: {
                  userId,
                  giftId: gift.id,
                  isTradeable: config.tradeable,
                  level: config.level,
                },
              },
              create: {
                userId,
                giftId: gift.id,
                quantity: 1,
                level: config.level,
                isTradeable: config.tradeable,
              },
              update: {
                quantity: { increment: 1 },
              },
            }),
          ),
        );

        return updated;
      });

      return {
        pack: pack,
        streak: updated.streak,
      };
    } catch (error) {
      this.logger.log(
        `Error in getting free pack for user ${userId}: ${error.message}`,
      );
      throw new HttpException('Internal server error', 500);
    }
  }

  async getPaidPacks() {
    return Object.entries(Pack)
      .filter(([type]) => !['FREE_DAILY', 'FREE_STREAK'].includes(type))
      .map(([type, config]) => ({
        type,
        price: config.price,
        level: config.level,
        total: config.total,
        tradeable: config.tradeable,
        composition: config.composition,
      }));
  }

  async buyPack(userId: string, data: BuyPackDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      const { pack, config } = await this.getPackByType(data.type as PackType);

      if (user.balance.toNumber() < config.price) {
        throw new HttpException('Insufficient balance', 400);
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            balance: { decrement: config.price },
          },
        });

        await Promise.all(
          pack.map((gift) =>
            tx.item.upsert({
              where: {
                userId_giftId_level_isTradeable: {
                  userId,
                  giftId: gift.id,
                  level: config.level,
                  isTradeable: config.tradeable,
                },
              },
              create: {
                userId,
                giftId: gift.id,
                quantity: 1,
                level: config.level,
                isTradeable: config.tradeable,
              },
              update: {
                quantity: { increment: 1 },
              },
            }),
          ),
        );
      });

      return {
        pack: pack,
        spent: config.price,
        balance: user.balance.toNumber() - config.price,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.log(
        `Error in buying pack for user ${userId}: ${error.message}`,
      );
      throw new HttpException('Internal server error', 500);
    }
  }

  private async getPackByType(type: PackType) {
    const config = Pack[type];
    const promises = Object.entries(config.composition).map(
      ([rarity, amount]) =>
        this.giftService.getRandomGiftsByRarity({
          rarity: rarity as Rarity,
          amount,
        }),
    );

    const result = await Promise.all(promises);
    const pack: Gift[] = result.flat();

    return { pack: pack, config: config };
  }
}
