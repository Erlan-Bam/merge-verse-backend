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
import { CollectionService } from 'src/collection/collection.service';
import { isVisible } from 'src/collection/types/is-visible.types';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    private prisma: PrismaService,
    private referralService: ReferralService,
    private giveawayService: GiveawayService,
    private collectionService: CollectionService,
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

  async getCollectionVisible() {
    try {
      const settings = await this.prisma.systemSettings.findUnique({
        where: { name: SystemSettingsName.COLLECTION_VISIBLE },
      });

      if (settings) {
        return settings.value as isVisible;
      }

      return { isVisible: true }; // Default value
    } catch (error) {
      this.logger.error('Failed to get collection visibility:', error);
      throw new HttpException(
        'Failed to get collection visibility',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async toggleCollectionVisible(isVisible: boolean) {
    try {
      const updated = await this.prisma.systemSettings.upsert({
        where: { name: SystemSettingsName.COLLECTION_VISIBLE },
        update: {
          value: { isVisible },
        },
        create: {
          name: SystemSettingsName.COLLECTION_VISIBLE,
          value: { isVisible },
        },
      });

      await this.collectionService.reloadCollectionVisibility();

      this.logger.log(`Collection visibility updated to: ${isVisible}`);

      return updated.value as isVisible;
    } catch (error) {
      this.logger.error('Failed to update collection visibility:', error);
      throw new HttpException(
        'Failed to update collection visibility',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async archiveUserItems(userId: string) {
    try {
      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, telegramId: true },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const items = await this.prisma.item.findMany({
        where: { userId },
        select: {
          userId: true,
          level: true,
          quantity: true,
          gift: {
            select: { id: true, name: true, rarity: true },
          },
        },
      });

      this.logger.log(
        `Found ${items.length} items to archive for user ${userId}`,
      );

      if (items.length === 0) {
        return {
          success: true,
          userId,
          telegramId: user.telegramId,
          archivedCount: 0,
          deletedCount: 0,
          message: `No items to archive for user ${user.telegramId}`,
        };
      }

      await this.prisma.$transaction(
        items.map((item) =>
          this.prisma.history.upsert({
            where: {
              userId_giftId_level: {
                userId: item.userId,
                giftId: item.gift.id,
                level: item.level,
              },
            },
            update: {},
            create: {
              userId: item.userId,
              giftId: item.gift.id,
              level: item.level,
              name: item.gift.name,
              rarity: item.gift.rarity,
            },
          }),
        ),
      );

      const deleted = await this.prisma.item.deleteMany({
        where: { userId },
      });

      this.logger.log(
        `Archived ${items.length} items to history for user ${userId}`,
      );
      this.logger.log(
        `Deleted ${deleted.count} items from inventory for user ${userId}`,
      );

      return {
        success: true,
        userId,
        telegramId: user.telegramId,
        archivedCount: items.length,
        deletedCount: deleted.count,
        message: `Successfully archived ${items.length} items for user ${user.telegramId}`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to archive user items:', error);
      throw new HttpException(
        'Failed to archive user items',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async archiveAllUsersItems() {
    try {
      const items = await this.prisma.item.findMany({
        select: {
          userId: true,
          level: true,
          quantity: true,
          gift: {
            select: { id: true, name: true, rarity: true },
          },
        },
      });

      this.logger.log(`Found ${items.length} items to archive`);

      if (items.length === 0) {
        this.logger.log('No items to process');
        return {
          success: true,
          archivedCount: 0,
          deletedCount: 0,
          message: 'No items to archive',
        };
      }

      await this.prisma.$transaction(
        items.map((item) =>
          this.prisma.history.upsert({
            where: {
              userId_giftId_level: {
                userId: item.userId,
                giftId: item.gift.id,
                level: item.level,
              },
            },
            update: {},
            create: {
              userId: item.userId,
              giftId: item.gift.id,
              level: item.level,
              name: item.gift.name,
              rarity: item.gift.rarity,
            },
          }),
        ),
      );

      const deleted = await this.prisma.item.deleteMany();

      this.logger.log(`Deleted ${deleted.count} items from inventory`);
      this.logger.log(`Processed ${items.length} history upserts successfully`);

      return {
        success: true,
        archivedCount: items.length,
        deletedCount: deleted.count,
        message: `Successfully archived all items from users`,
      };
    } catch (error) {
      this.logger.error('Failed to archive all users items:', error);
      throw new HttpException(
        'Failed to archive all users items',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async toggleUserBan(userId: string, isBanned: boolean) {
    try {
      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          telegramId: true,
          isBanned: true,
          role: true,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Prevent banning admin users
      if (user.role === 'ADMIN') {
        throw new HttpException(
          'Cannot ban admin users',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Update ban status
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { isBanned },
        select: {
          id: true,
          telegramId: true,
          isBanned: true,
          role: true,
        },
      });

      this.logger.log(
        `User ${updatedUser.telegramId} ${isBanned ? 'banned' : 'unbanned'}`,
      );

      return {
        success: true,
        user: updatedUser,
        message: `User ${updatedUser.telegramId} ${isBanned ? 'banned' : 'unbanned'} successfully`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to toggle user ban:', error);
      throw new HttpException(
        'Failed to toggle user ban',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteUser(userId: string) {
    try {
      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          telegramId: true,
          role: true,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Prevent deleting admin users
      if (user.role === 'ADMIN') {
        throw new HttpException(
          'Cannot delete admin users',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Delete user (cascade will handle related records)
      await this.prisma.user.delete({
        where: { id: userId },
      });

      this.logger.log(`User ${user.telegramId} deleted successfully`);

      return {
        success: true,
        deletedUserId: userId,
        telegramId: user.telegramId,
        message: `User ${user.telegramId} deleted successfully`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to delete user:', error);
      throw new HttpException(
        'Failed to delete user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateUserBalance(userId: string, balance: number) {
    try {
      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          telegramId: true,
          balance: true,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const oldBalance = user.balance;

      // Update user balance
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { balance },
        select: {
          id: true,
          telegramId: true,
          balance: true,
        },
      });

      this.logger.log(
        `User ${updatedUser.telegramId} balance updated from ${oldBalance} to ${balance}`,
      );

      return {
        success: true,
        user: updatedUser,
        oldBalance: oldBalance.toString(),
        newBalance: updatedUser.balance.toString(),
        message: `User ${updatedUser.telegramId} balance updated successfully`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to update user balance:', error);
      throw new HttpException(
        'Failed to update user balance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async resetAllBalances() {
    try {
      // Reset all users' balances to 0
      const result = await this.prisma.user.updateMany({
        data: { balance: 0 },
      });

      this.logger.log(`Reset balances for ${result.count} users to 0`);

      return {
        success: true,
        affectedUsers: result.count,
        message: `Successfully reset balances for ${result.count} users`,
      };
    } catch (error) {
      this.logger.error('Failed to reset all balances:', error);
      throw new HttpException(
        'Failed to reset all balances',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
