import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import {
  GiveawayStatus,
  Level,
  PackType,
  Prisma,
  Rarity,
  SystemSettingsName,
  WinnerChoice,
} from '@prisma/client';
import { GetGiveawaysDto } from './dto/get-giveaways.dto';
import { BotService } from 'src/shared/services/bot.service';
import { EnterGiveawayDto } from './dto/enter-giveaway.dto';
import { GiftService } from 'src/gift/gift.service';
import { GetGiveawaysWinnerDto } from './dto/get-giveaways-winner.dto';
import { GiveawaySteps } from './types/steps.types';

@Injectable()
export class GiveawayService implements OnModuleInit {
  private readonly logger = new Logger(GiveawayService.name);
  private steps: number = 30; // Default value

  constructor(
    private readonly prisma: PrismaService,
    private readonly botService: BotService,
    private readonly giftService: GiftService,
  ) {}

  async onModuleInit() {
    await this.loadGiveawaySteps();
  }

  /**
   * Load giveaway steps from database and cache in memory
   */
  async loadGiveawaySteps() {
    try {
      const settings = await this.prisma.systemSettings.findUnique({
        where: { name: SystemSettingsName.GIVEAWAY_STEPS },
      });

      if (settings) {
        this.steps = (settings.value as GiveawaySteps).steps;
        this.logger.log(`Loaded giveaway steps: ${this.steps}`);
      } else {
        // Initialize with default value if not exists
        await this.prisma.systemSettings.create({
          data: {
            name: SystemSettingsName.GIVEAWAY_STEPS,
            value: { steps: 30 },
          },
        });
        this.steps = 30;
        this.logger.log('Initialized giveaway steps with default value: 30');
      }
    } catch (error) {
      this.logger.error(
        'Failed to load giveaway steps, using default (30):',
        error,
      );
      this.steps = 30;
    }
  }

  /**
   * Get current giveaway steps value
   */
  getGiveawaySteps(): number {
    return this.steps;
  }

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
          winners: {
            select: {
              id: true,
              userId: true,
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
          winners: true,
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
        return await tx.entry.create({
          data: {
            giveawayId: data.giveawayId,
            userId,
            giftId: data.giftId,
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

  async getTopWinners(query: GetGiveawaysWinnerDto) {
    try {
      const where: Prisma.GiveawayWhereInput = {
        status: GiveawayStatus.FINISHED,
      };

      if (query.id) {
        where.id = query.id;
      }

      if (query.rarity) {
        where.gift = {
          rarity: query.rarity,
        };
      }

      const stats = await this.prisma.winner.groupBy({
        by: ['userId'],
        where: {
          giveaway: where,
        },
        _count: {
          userId: true,
        },
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
      });

      if (stats.length === 0) {
        return [];
      }

      const winnerIds = stats.map((stat) => stat.userId);

      const winnerWhere: Prisma.WinnerWhereInput = {
        giveaway: where,
      };

      const users = await this.prisma.user.findMany({
        where: { id: { in: winnerIds } },
        select: {
          id: true,
          telegramId: true,
          winnings: {
            where: winnerWhere,
            include: {
              giveaway: {
                include: {
                  gift: {
                    select: {
                      id: true,
                      name: true,
                      rarity: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      const result = stats.map((stat) => {
        const user = users.find((u) => u.id === stat.userId);

        // Count wins by rarity
        const winsByRarity = {
          [Rarity.COMMON]: 0,
          [Rarity.RARE]: 0,
          [Rarity.EPIC]: 0,
          [Rarity.LEGENDARY]: 0,
          [Rarity.MYTHIC]: 0,
        };

        user?.winnings.forEach((winning) => {
          const rarity = winning.giveaway.gift.rarity;
          winsByRarity[rarity]++;
        });

        return {
          user: {
            id: user?.id,
            telegramId: user?.telegramId,
          },
          totalWins: stat._count.userId,
          winsByRarity,
          winnings: user?.winnings ?? [],
        };
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to fetch winners:', error);
      throw new HttpException(
        'Failed to fetch winners',
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
        select: {
          id: true,
        },
      });

      for (const giveaway of giveaways) {
        await this.finishGiveaway(giveaway.id);
      }
    } catch (error) {
      this.logger.error('Failed to finish monthly giveaways:', error);
      throw error;
    }
  }

  async finishGiveaway(giveawayId: string) {
    try {
      const { winners, entries } = await this.prisma.$transaction(
        async (tx) => {
          const giveaway = await tx.giveaway.findUnique({
            where: { id: giveawayId },
            select: {
              status: true,
              gift: {
                select: { id: true, name: true, rarity: true },
              },
              entries: {
                select: {
                  user: {
                    select: { id: true, telegramId: true },
                  },
                  giftId: true,
                  isTradeable: true,
                  gift: {
                    select: { rarity: true },
                  },
                },
              },
            },
          });

          if (!giveaway || giveaway.status !== GiveawayStatus.ACTIVE) {
            throw new HttpException('Giveaway not found', HttpStatus.NOT_FOUND);
          }

          if (giveaway.entries.length < this.steps) {
            for (const entry of giveaway.entries) {
              await tx.item.upsert({
                where: {
                  userId_giftId_level_isTradeable: {
                    userId: entry.user.id,
                    giftId: entry.giftId,
                    level: Level.L10,
                    isTradeable: entry.isTradeable,
                  },
                },
                update: { quantity: { increment: 1 } },
                create: {
                  userId: entry.user.id,
                  giftId: entry.giftId,
                  level: Level.L10,
                  isTradeable: entry.isTradeable,
                  quantity: 1,
                },
              });
            }
            await tx.giveaway.update({
              where: { id: giveawayId },
              data: {
                status: GiveawayStatus.CANCELLED,
              },
            });
            return {
              winners: [],
              entries: giveaway.entries,
            };
          } else {
            const numberOfWinners = Math.min(
              10,
              Math.ceil(giveaway.entries.length / this.steps),
            );
            const selectedWinners = this.getRandomItems(
              giveaway.entries,
              numberOfWinners,
            );

            const winners = await Promise.all(
              selectedWinners.map((winner) =>
                tx.winner.create({
                  data: {
                    giveawayId,
                    userId: winner.user.id,
                    choice: WinnerChoice.PENDING,
                    isFinished: false,
                  },
                  select: {
                    id: true,
                    user: {
                      select: {
                        id: true,
                        telegramId: true,
                      },
                    },
                    giveaway: {
                      select: {
                        gift: {
                          select: {
                            name: true,
                            rarity: true,
                          },
                        },
                      },
                    },
                  },
                }),
              ),
            );

            await tx.giveaway.update({
              where: { id: giveawayId },
              data: {
                status: GiveawayStatus.FINISHED,
              },
            });

            return { winners: winners, entries: giveaway.entries };
          }
        },
      );

      // Send notifications to winners
      for (const winner of winners) {
        this.logger.log(
          `Notifying winner ${winner.user.telegramId} for giveaway ${giveawayId}`,
        );
        await this.botService.sendWinnerNotification(
          winner.user.telegramId,
          winner.user.id,
          winner.giveaway.gift.name,
          winner.giveaway.gift.rarity,
        );
      }

      // Give compensation to all participants based on their entry gift rarity
      for (const entry of entries) {
        try {
          const { packType, amount } = this.getCompensationByRarity(
            entry.gift.rarity,
          );
          await this.giveCompensation(entry.user.id, packType, amount);
          this.logger.log(
            `Gave compensation to user ${entry.user.id}: ${amount}x ${packType} (based on ${entry.gift.rarity} gift)`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to give compensation to user ${entry.user.id}:`,
            error,
          );
        }
      }

      this.logger.log(`Finished giveaway ${giveawayId}`);
    } catch (error) {
      this.logger.error('Failed to finish giveaway:', error);
      throw error;
    }
  }

  /**
   * Get compensation pack type and amount based on gift rarity
   */
  private getCompensationByRarity(rarity: Rarity): {
    packType: PackType;
    amount: number;
  } {
    const map = {
      [Rarity.COMMON]: { packType: PackType.COMMON_PACK, amount: 3 },
      [Rarity.RARE]: { packType: PackType.RARE_PACK, amount: 4 },
      [Rarity.EPIC]: { packType: PackType.EPIC_PACK, amount: 6 },
      [Rarity.LEGENDARY]: { packType: PackType.LEGENDARY_PACK, amount: 3 },
      [Rarity.MYTHIC]: { packType: PackType.LEGENDARY_PACK, amount: 12 },
    };

    return map[rarity];
  }

  async giveCompensation(userId: string, packType: PackType, amount: number) {
    try {
      await this.prisma.compensation.create({
        data: {
          userId: userId,
          type: packType,
          amount: amount,
        },
      });
    } catch (error) {
      this.logger.error('Failed to give compensation:', error);
      throw new HttpException(
        'Failed to give compensation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getRandomItems<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

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
