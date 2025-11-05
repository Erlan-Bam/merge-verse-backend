import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ReferralService } from 'src/shared/services/referral.service';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    private prisma: PrismaService,
    private referralService: ReferralService,
  ) {}
  async getWinnersChoices() {
    try {
      const winners = await this.prisma.winner.findMany({
        where: { choice: { not: null }, isFinished: false },
        include: {
          user: {
            select: {
              id: true,
              telegramId: true,
            },
          },
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      return winners;
    } catch (error) {
      this.logger.error('Failed to fetch winners for admin:', error);
      throw new HttpException(
        'Failed to fetch winners for admin',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getReferralSettings() {
    try {
      return this.referralService.getAllSettings();
    } catch (error) {
      this.logger.error('Failed to fetch referral settings:', error);
      throw new HttpException(
        'Failed to fetch referral settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateReferralSettings(data: UpdateReferralSettingsDto) {
    try {
      const updated = await this.prisma.referralSettings.upsert({
        where: { name: data.name },
        update: {
          type: data.type,
          value: data.value,
        },
        create: {
          name: data.name,
          type: data.type,
          value: data.value,
        },
      });

      // Reload settings in ReferralService
      await this.referralService.loadSettings();

      this.logger.log(
        `Referral setting updated: ${data.name} = ${data.value} (${data.type})`,
      );

      return updated;
    } catch (error) {
      this.logger.error('Failed to update referral settings:', error);
      throw new HttpException(
        'Failed to update referral settings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
