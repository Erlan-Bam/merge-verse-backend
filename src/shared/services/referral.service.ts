import { Injectable, Logger } from '@nestjs/common';
import {
  ReferralSettings,
  ReferralSettingsName,
  ValueType,
} from '@prisma/client';
import { PrismaService } from './prisma.service';

@Injectable()
export class ReferralService {
  private settings: Map<ReferralSettingsName, ReferralSettings> = new Map();
  private readonly logger = new Logger(ReferralService.name);

  constructor(private prisma: PrismaService) {
    this.loadSettings().catch((error) => {
      this.logger.error('Failed to load referral settings:', error);
    });
  }

  /**
   * Load referral settings from database and cache them
   */
  async loadSettings(): Promise<void> {
    try {
      const settings = await this.prisma.referralSettings.findMany();

      this.settings.clear();
      settings.forEach((setting) => {
        this.settings.set(setting.name, setting);
      });

      this.logger.log(`Loaded ${settings.length} referral settings`);
    } catch (error) {
      this.logger.error('Failed to load referral settings:', error);
      throw error;
    }
  }

  /**
   * Get first level referral commission (4% of deposit)
   */
  getFirstLevelCommission(amount: number): number {
    const setting = this.settings.get(
      ReferralSettingsName.REFERRAL_FIRST_LEVEL,
    );
    if (!setting) {
      this.logger.warn(
        'First level referral setting not found, using default 4%',
      );
      return amount * 0.04;
    }

    if (setting.type === ValueType.PERCENTAGE) {
      return amount * (setting.value.toNumber() / 100);
    } else {
      return setting.value.toNumber();
    }
  }

  /**
   * Get second level referral commission (2% of deposit)
   */
  getSecondLevelCommission(amount: number): number {
    const setting = this.settings.get(
      ReferralSettingsName.REFERRAL_SECOND_LEVEL,
    );
    if (!setting) {
      this.logger.warn(
        'Second level referral setting not found, using default 2%',
      );
      return amount * 0.02;
    }

    if (setting.type === ValueType.PERCENTAGE) {
      return amount * (setting.value.toNumber() / 100);
    } else {
      return setting.value.toNumber();
    }
  }

  /**
   * Get full collection bonus for referrer ($22.50)
   */
  getFullCollectionBonus(): number {
    const setting = this.settings.get(
      ReferralSettingsName.REFERRAL_FULL_COLLECTION,
    );
    if (!setting) {
      this.logger.warn(
        'Full collection referral setting not found, using default $22.50',
      );
      return 22.5;
    }

    return setting.value.toNumber();
  }

  /**
   * Calculate and distribute referral commissions on deposit
   * Returns object with firstLevel and secondLevel amounts
   */
  async processDepositReferrals(
    userId: string,
    depositAmount: number,
  ): Promise<{
    firstLevel?: { userId: string; amount: number };
    secondLevel?: { userId: string; amount: number };
  }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          referredBy: true,
          referrer: {
            select: {
              id: true,
              referredBy: true,
            },
          },
        },
      });

      const result: {
        firstLevel?: { userId: string; amount: number };
        secondLevel?: { userId: string; amount: number };
      } = {};

      // First level referral
      if (user?.referredBy) {
        const firstLevelAmount = this.getFirstLevelCommission(depositAmount);
        result.firstLevel = {
          userId: user.referredBy,
          amount: firstLevelAmount,
        };

        // Second level referral (referrer of referrer)
        if (user.referrer?.referredBy) {
          const secondLevelAmount =
            this.getSecondLevelCommission(depositAmount);
          result.secondLevel = {
            userId: user.referrer.referredBy,
            amount: secondLevelAmount,
          };
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to process deposit referrals:', error);
      return {};
    }
  }

  /**
   * Get all referral settings
   */
  getAllSettings(): ReferralSettings[] {
    return Array.from(this.settings.values());
  }

  /**
   * Get specific referral setting by name
   */
  getSetting(name: ReferralSettingsName): ReferralSettings | undefined {
    return this.settings.get(name);
  }
}
