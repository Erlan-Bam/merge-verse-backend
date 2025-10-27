import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Gift, Level, Rarity } from '@prisma/client';
import { GiftService } from 'src/gift/gift.service';
import { PrismaService } from 'src/shared/services/prisma.service';
import { Pack } from './const/pack.const';

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
          throw new HttpException('Daily pack already claimed today', 400);
        }
      }

      const isStreak = user.streak + 1 >= 7;
      const config = isStreak ? Pack.FREE_STREAK : Pack.FREE_DAILY;

      const promises = Object.entries(config.composition).map(
        ([rarity, amount]) =>
          this.giftService.getRandomGiftsByRarity({
            rarity: rarity as Rarity,
            amount,
          }),
      );

      const result = await Promise.all(promises);
      const pack: Gift[] = result.flat();

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            activeAt: new Date(),
            streak: isStreak ? 0 : user.streak + 1,
          },
        });
        await tx.item.createMany({
          data: pack.map((gift) => ({
            userId,
            giftId: gift.id,
            quantity: 1,
            level: config.level,
            isTradeable: config.tradeable,
          })),
        });
      });

      return { pack };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.log(
        `Error in getting free pack for user ${userId}: ${error.message}`,
      );
      throw new HttpException('Internal server error', 500);
    }
  }

  async getPack() {}
}
