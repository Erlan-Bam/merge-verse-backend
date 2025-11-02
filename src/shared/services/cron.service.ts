import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { GiveawayService } from 'src/giveaway/giveaway.service';
import { AuctionService } from 'src/auction/auction.service';
import { AuctionStatus } from '@prisma/client';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly giveawayService: GiveawayService,
    private readonly auctionService: AuctionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyStreak() {
    this.logger.log('Starting daily streak task');

    const result = await this.prisma.user.updateMany({
      where: {
        streak: {
          gt: 0,
        },
        activeAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      data: {
        streak: 0,
      },
    });

    this.logger.log(`Reset streak for ${result.count} inactive users`);
  }

  /**
   * Start monthly giveaways on the 2nd of each month at 00:01 UTC
   */
  @Cron('1 0 2 * *', {
    timeZone: 'UTC',
  })
  async handleStartMonthlyGiveaways() {
    this.logger.log('Starting monthly giveaway creation task');

    try {
      await this.giveawayService.createMonthlyGiveaways();
      this.logger.log('Monthly giveaways created successfully');
    } catch (error) {
      this.logger.error('Failed to create monthly giveaways:', error);
    }
  }

  /**
   * Finish monthly giveaways on the 1st of each month at 00:01 UTC
   */
  @Cron('1 0 1 * *', {
    timeZone: 'UTC',
  })
  async handleFinishMonthlyGiveaways() {
    this.logger.log('Starting monthly giveaway finish task');

    try {
      await this.giveawayService.finishMonthlyGiveaways();
      this.logger.log('Monthly giveaways finished successfully');
    } catch (error) {
      this.logger.error('Failed to finish monthly giveaways:', error);
    }
  }

  /**
   * Automatically finish expired auctions every hour
   * Runs at minute 0 of every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredAuctions() {
    this.logger.log('Starting expired auctions check');

    try {
      // Find all active auctions that have expired
      const auctions = await this.prisma.auction.findMany({
        where: {
          status: AuctionStatus.ACTIVE,
          endsAt: {
            lt: new Date(),
          },
        },
        select: {
          id: true,
          userId: true,
          giftId: true,
          level: true,
          bids: {
            orderBy: { amount: 'desc' },
            take: 1,
          },
        },
      });

      if (auctions.length === 0) {
        this.logger.log('No expired auctions found');
        return;
      }

      this.logger.log(`Found ${auctions.length} expired auctions`);

      let success = 0;
      let fail = 0;

      for (const auction of auctions) {
        try {
          await this.auctionService.finishAuction(auction.userId, {
            auctionId: auction.id,
          });
        } catch (error) {
          fail++;
          this.logger.error(`Failed to process auction ${auction.id}:`, error);
        }
      }

      this.logger.log(
        `Finished processing expired auctions: ${success} successful, ${fail} failed`,
      );
    } catch (error) {
      this.logger.error('Failed to process expired auctions:', error);
    }
  }
}
