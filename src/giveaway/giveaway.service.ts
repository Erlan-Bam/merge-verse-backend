import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { GiveawayStatus, Level } from '@prisma/client';
import { GetGiveawaysDto } from './dto/get-giveaways.dto';
import { BotService } from 'src/shared/services/bot.service';
import { EnterGiveawayDto } from './dto/enter-giveaway.dto';
import { GiftService } from 'src/gift/gift.service';

@Injectable()
export class GiveawayService {
  private readonly logger = new Logger(GiveawayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly botService: BotService,
    private readonly giftService: GiftService,
  ) {}

  async getGiveaways(query: GetGiveawaysDto) {
    try {
      const where = query.status ? { status: query.status } : {};

      const giveaways = await this.prisma.giveaway.findMany({
        where,
        include: {
          gift: {
            select: {
              id: true,
              name: true,
              rarity: true,
              url: true,
            },
          },
          winner: {
            select: {
              id: true,
              telegramId: true,
            },
          },
          _count: {
            select: {
              entries: true,
            },
          },
        },
        orderBy: {
          startAt: 'asc',
        },
      });

      return giveaways;
    } catch (error) {
      this.logger.error('Failed to get giveaways:', error);
      throw new HttpException(
        'Failed to get giveaways',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getGiveawayById(giveawayId: string) {
    try {
      const giveaway = await this.prisma.giveaway.findUnique({
        where: { id: giveawayId },
        include: {
          gift: true,
          winner: {
            select: {
              id: true,
              telegramId: true,
            },
          },
          _count: {
            select: {
              entries: true,
            },
          },
        },
      });

      if (!giveaway) {
        throw new HttpException('Giveaway not found', HttpStatus.NOT_FOUND);
      }

      return giveaway;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to get giveaway:', error);
      throw new HttpException(
        'Failed to get giveaway',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Enter a user into a giveaway
   */
  async enterGiveaway(userId: string, data: EnterGiveawayDto) {
    try {
      const giveaway = await this.prisma.giveaway.findUnique({
        where: { id: data.giveawayId },
      });

      if (!giveaway) {
        throw new HttpException('Giveaway not found', HttpStatus.NOT_FOUND);
      }

      if (giveaway.status !== GiveawayStatus.ACTIVE) {
        throw new HttpException(
          'Giveaway is not active',
          HttpStatus.BAD_REQUEST,
        );
      }

      const item = await this.prisma.item.findFirst({
        where: { userId: userId, giftId: data.giftId, level: Level.L10 },
        orderBy: {
          isTradeable: 'asc',
        },
        select: {
          id: true,
          level: true,
          isTradeable: true,
          quantity: true,
        },
      });

      if (!item) {
        throw new HttpException(
          'User does not own the required item to enter the giveaway',
          HttpStatus.BAD_REQUEST,
        );
      }

      const entry = await this.prisma.$transaction(async (tx) => {
        if (item.quantity > 1) {
          await tx.item.update({
            where: { id: item.id },
            data: { quantity: item.quantity - 1 },
          });
        } else {
          await tx.item.delete({ where: { id: item.id } });
        }
        return tx.entry.create({
          data: {
            giveawayId: data.giveawayId,
            userId,
            isTradeable: item.isTradeable,
          },
          include: {
            giveaway: {
              include: {
                gift: true,
              },
            },
          },
        });
      });

      return entry;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to enter giveaway:', error);
      throw new HttpException(
        'Failed to enter giveaway',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user's giveaway entries
   */
  async getUserEntries(userId: string) {
    try {
      const entries = await this.prisma.entry.findMany({
        where: { userId },
        include: {
          giveaway: {
            include: {
              gift: true,
              _count: {
                select: {
                  entries: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return entries;
    } catch (error) {
      this.logger.error('Failed to get user entries:', error);
      throw new HttpException(
        'Failed to get user entries',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create monthly giveaways for all 20 gifts
   * Called by cron on the 2nd of each month at 00:01 UTC
   */
  async createMonthlyGiveaways() {
    try {
      this.logger.log('Creating monthly giveaways...');

      // Get all gifts
      const gifts = await this.giftService.getAllGifts();

      if (gifts.length === 0) {
        this.logger.warn('No gifts found for giveaways');
        return;
      }

      // Calculate start and end dates
      const now = new Date();
      const startAt = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 2, 0, 1, 0, 0),
      );

      // End on the 1st of next month at 00:01 UTC
      const endsAt = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 1, 0, 0),
      );

      const giveaways = await this.prisma.giveaway.createMany({
        data: gifts.map((gift) => ({
          giftId: gift.id,
          status: GiveawayStatus.ACTIVE,
          startAt,
          endsAt,
        })),
      });

      this.logger.log(`Created ${giveaways.count} monthly giveaways`);

      return giveaways;
    } catch (error) {
      this.logger.error('Failed to create monthly giveaways:', error);
      throw error;
    }
  }

  /**
   * Finish all active giveaways and select winners
   * Called by cron on the 1st of each month at 00:01 UTC
   */
  async finishMonthlyGiveaways() {
    try {
      this.logger.log('Finishing monthly giveaways...');

      const giveaways = await this.prisma.giveaway.findMany({
        where: {
          status: GiveawayStatus.ACTIVE,
        },
        include: {
          gift: true,
          _count: {
            select: {
              entries: true,
            },
          },
        },
      });

      for (const giveaway of giveaways) {
        if (giveaway._count.entries < 30) {
        }
      }
    } catch (error) {
      this.logger.error('Failed to finish monthly giveaways:', error);
      throw error;
    }
  }

  async finishGiveaway(giveawayId: string) {}

  //   /**
  //    * Helper method to get random items from array
  //    */
  //   private getRandomItems<T>(arr: T[], n: number): T[] {
  //     const copy = [...arr];
  //     for (let i = copy.length - 1; i > 0; i--) {
  //       const j = Math.floor(Math.random() * (i + 1));
  //       [copy[i], copy[j]] = [copy[j], copy[i]];
  //     }
  //     return copy.slice(0, n);
  //   }

  //   /**
  //    * Admin: Create a manual giveaway
  //    */
  //   async createGiveaway(giftId: string, startAt?: Date, endsAt?: Date) {
  //     try {
  //       // Verify gift exists
  //       const gift = await this.prisma.gift.findUnique({
  //         where: { id: giftId },
  //       });

  //       if (!gift) {
  //         throw new HttpException('Gift not found', HttpStatus.NOT_FOUND);
  //       }

  //       const now = new Date();
  //       const giveaway = await this.prisma.giveaway.create({
  //         data: {
  //           giftId,
  //           level: Level.L0,
  //           status:
  //             startAt && startAt > now
  //               ? GiveawayStatus.PENDING
  //               : GiveawayStatus.ACTIVE,
  //           startAt: startAt || now,
  //           endsAt: endsAt || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
  //         },
  //         include: {
  //           gift: true,
  //         },
  //       });

  //       return giveaway;
  //     } catch (error) {
  //       if (error instanceof HttpException) throw error;
  //       this.logger.error('Failed to create giveaway:', error);
  //       throw new HttpException(
  //         'Failed to create giveaway',
  //         HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     }
  //   }

  //   /**
  //    * Admin: Delete a giveaway
  //    */
  //   async deleteGiveaway(giveawayId: string) {
  //     try {
  //       await this.prisma.giveaway.delete({
  //         where: { id: giveawayId },
  //       });
  //     } catch (error) {
  //       this.logger.error('Failed to delete giveaway:', error);
  //       throw new HttpException(
  //         'Failed to delete giveaway',
  //         HttpStatus.INTERNAL_SERVER_ERROR,
  //       );
  //     }
  //   }
}
