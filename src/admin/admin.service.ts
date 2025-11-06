import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { ReferralService } from 'src/shared/services/referral.service';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';
import { UpdateGiveawayDto } from './dto/update-giveaway.dto';
import { ToggleGiveawayDto } from './dto/toggle-giveaway.dto';
import { UpdateGiveawayStepsDto } from './dto/update-giveaway-steps.dto';
import { GiveawayStatus, SystemSettingsName } from '@prisma/client';
import { GiveawayService } from 'src/giveaway/giveaway.service';
import { GiveawaySteps } from 'src/giveaway/types/steps.types';
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    private prisma: PrismaService,
    private referralService: ReferralService,
    private giveawayService: GiveawayService,
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

  async getAllGiveaways() {
    try {
      const giveaways = await this.prisma.giveaway.findMany({
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
      this.logger.error('Failed to get all giveaways:', error);
      throw new HttpException(
        'Failed to get all giveaways',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateGiveaway(giveawayId: string, data: UpdateGiveawayDto) {
    try {
      const giveaway = await this.prisma.giveaway.findUnique({
        where: { id: giveawayId },
      });

      if (!giveaway) {
        throw new HttpException('Giveaway not found', HttpStatus.NOT_FOUND);
      }

      const updateData: any = {};

      if (data.startAt) {
        updateData.startAt = new Date(data.startAt);
      }

      if (data.endsAt) {
        updateData.endsAt = new Date(data.endsAt);
      }

      if (data.status) {
        updateData.status = data.status;
      }

      const updated = await this.prisma.giveaway.update({
        where: { id: giveawayId },
        data: updateData,
        include: {
          gift: true,
        },
      });

      this.logger.log(`Giveaway ${giveawayId} updated`);

      return updated;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to update giveaway:', error);
      throw new HttpException(
        'Failed to update giveaway',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async toggleGiveaway(giveawayId: string, data: ToggleGiveawayDto) {
    try {
      const giveaway = await this.prisma.giveaway.findUnique({
        where: { id: giveawayId },
      });

      if (!giveaway) {
        throw new HttpException('Giveaway not found', HttpStatus.NOT_FOUND);
      }

      const newStatus = data.active
        ? GiveawayStatus.ACTIVE
        : GiveawayStatus.CANCELLED;

      const updated = await this.prisma.giveaway.update({
        where: { id: giveawayId },
        data: { status: newStatus },
        include: {
          gift: true,
        },
      });

      this.logger.log(`Giveaway ${giveawayId} toggled to ${newStatus}`);

      return updated;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to toggle giveaway:', error);
      throw new HttpException(
        'Failed to toggle giveaway',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getGiveawaySteps() {
    try {
      const settings = await this.prisma.systemSettings.findUnique({
        where: { name: SystemSettingsName.GIVEAWAY_STEPS },
      });

      if (settings) {
        return settings.value as GiveawaySteps;
      }

      return { steps: 30 }; // Default value
    } catch (error) {
      this.logger.error('Failed to get giveaway steps:', error);
      throw new HttpException(
        'Failed to get giveaway steps',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateGiveawaySteps(data: UpdateGiveawayStepsDto) {
    try {
      const updated = await this.prisma.systemSettings.upsert({
        where: { name: SystemSettingsName.GIVEAWAY_STEPS },
        update: {
          value: { steps: data.steps },
        },
        create: {
          name: SystemSettingsName.GIVEAWAY_STEPS,
          value: { steps: data.steps },
        },
      });

      await this.giveawayService.loadGiveawaySteps();

      this.logger.log(`Giveaway steps updated to: ${data.steps}`);

      return updated.value as GiveawaySteps;
    } catch (error) {
      this.logger.error('Failed to update giveaway steps:', error);
      throw new HttpException(
        'Failed to update giveaway steps',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
