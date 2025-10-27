import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Gift, Level, Rarity } from '@prisma/client';
import { GiftService } from 'src/gift/gift.service';
import { PrismaService } from 'src/shared/services/prisma.service';

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

      let pack: Gift[] = [];

      if (user.streak + 1 >= 7) {
        const common = await this.giftService.getRandomGiftsByRarity({
          rarity: Rarity.COMMON,
          amount: 9,
        });
        const rare = await this.giftService.getRandomGiftsByRarity({
          rarity: Rarity.RARE,
          amount: 4,
        });
        const epic = await this.giftService.getRandomGiftsByRarity({
          rarity: Rarity.EPIC,
          amount: 2,
        });
        pack = [...common, ...rare, ...epic];
      } else {
        const common = await this.giftService.getRandomGiftsByRarity({
          rarity: Rarity.COMMON,
          amount: 7,
        });
        const rare = await this.giftService.getRandomGiftsByRarity({
          rarity: Rarity.RARE,
          amount: 2,
        });
        const epic = await this.giftService.getRandomGiftsByRarity({
          rarity: Rarity.EPIC,
          amount: 1,
        });
        pack = [...common, ...rare, ...epic];
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            activeAt: new Date(),
            streak: user.streak + 1 >= 7 ? 0 : user.streak + 1,
          },
        });
        await tx.item.createMany({
          data: pack.map((gift) => ({
            userId,
            giftId: gift.id,
            quantity: 1,
            level: Level.L0,
            isTradeable: false,
          })),
        });
      });

      return { pack: pack };
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
}
