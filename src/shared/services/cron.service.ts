import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}
