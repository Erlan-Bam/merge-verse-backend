import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { GiveawayService } from 'src/giveaway/giveaway.service';
import { AuctionService } from 'src/auction/auction.service';
import { AuctionStatus, PaymentStatus } from '@prisma/client';
import { ReferralService } from './referral.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly giveawayService: GiveawayService,
    private readonly auctionService: AuctionService,
    private readonly referralService: ReferralService,
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
      await this.prisma.$transaction(async (tx) => {
        // Get all items from the Item table
        const items = await tx.item.findMany();

        this.logger.log(`Found ${items.length} items to archive`);

        if (items.length > 0) {
          // Copy all items to History table
          await tx.history.createMany({
            data: items.map((item) => ({
              userId: item.userId,
              giftId: item.giftId,
              level: item.level,
              quantity: item.quantity,
              isTradeable: item.isTradeable,
              itemCreatedAt: item.createdAt,
              itemUpdatedAt: item.updatedAt,
            })),
          });

          this.logger.log(`Archived ${items.length} items to history`);

          // Delete all items from the Item table
          const result = await tx.item.deleteMany();
          this.logger.log(`Deleted ${result.count} items from inventory`);
        }
      });

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

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredPayments() {
    try {
      const payments = await this.prisma.payment.updateMany({
        where: {
          status: PaymentStatus.PENDING,
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        data: { status: PaymentStatus.FAILED },
      });
      this.logger.log(`Expired payments updated: ${payments.count}`);
    } catch (error) {
      this.logger.error('Failed to process expired payments:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteExpiredCompensations() {
    try {
      const result = await this.prisma.compensation.deleteMany({
        where: {
          createdAt: { lt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000) },
        },
      });
      this.logger.log(`Deleted ${result.count} expired compensations`);
    } catch (error) {
      this.logger.error('Failed to delete expired compensations:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshReferralSettings() {
    try {
      await this.referralService.loadSettings();
      this.logger.log('Referral settings refreshed successfully');
    } catch (error) {
      this.logger.error('Failed to refresh referral settings:', error);
    }
  }
}
