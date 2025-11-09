import { HttpException, Injectable, Logger } from '@nestjs/common';
import {
  HorizontalPrice,
  Item,
  Level,
  Rarity,
  SystemSettingsName,
  VerticalPrice,
} from '@prisma/client';
import { GiftService } from 'src/gift/gift.service';
import { PrismaService } from 'src/shared/services/prisma.service';
import { CraftCardDto } from './dto/craft-card.dto';
import { ReferralService } from 'src/shared/services/referral.service';
import { isVisible } from './types/is-visible.types';
import { MoveToCraftTableDto } from './dto/move-to-craft-table.dto';

@Injectable()
export class CollectionService {
  private vertical: VerticalPrice[] = [];
  private horizontal: HorizontalPrice[] = [];
  private readonly logger = new Logger(CollectionService.name);
  private isCollectionVisible: boolean = true;

  constructor(
    private giftService: GiftService,
    private prisma: PrismaService,
    private referralService: ReferralService,
  ) {
    this.setPrices().catch((error) => {
      this.logger.error(error);
    });
    this.loadCollectionVisibility().catch((error) => {
      this.logger.error(error);
    });
  }

  private async setPrices(): Promise<void> {
    await this.prisma.ensureConnected();
    try {
      this.vertical = await this.prisma.verticalPrice.findMany();
      this.horizontal = await this.prisma.horizontalPrice.findMany();
    } catch (error) {
      this.logger.error('Failed to get price data: ', error);
    }
  }

  private async loadCollectionVisibility(): Promise<void> {
    await this.prisma.ensureConnected();
    try {
      const settings = await this.prisma.systemSettings.findUnique({
        where: { name: SystemSettingsName.COLLECTION_VISIBLE },
      });

      if (settings && settings.value) {
        const value = settings.value as isVisible;
        this.isCollectionVisible = value.isVisible ?? true;
      } else {
        this.isCollectionVisible = true;
      }
    } catch (error) {
      this.logger.error('Failed to load collection visibility: ', error);
      this.isCollectionVisible = true;
    }
  }

  async reloadCollectionVisibility(): Promise<void> {
    await this.loadCollectionVisibility();
  }

  async getCollection(userId: string) {
    try {
      if (!this.isCollectionVisible) {
        throw new HttpException('Collection is currently not available', 403);
      }

      const collection = await this.giftService.getUserGifts(userId);

      return { collection: collection };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to get collection: ', error);
      throw new HttpException('Collection retrieval failed', 500);
    }
  }

  async checkCollection(userId: string) {
    if (this.vertical.length === 0 || this.horizontal.length === 0) {
      await this.setPrices();
    }

    if (!this.isCollectionVisible) {
      throw new HttpException('Collection is currently not available', 403);
    }

    try {
      const collection = await this.giftService.getUserGifts(userId);
      const gifts = await this.giftService.getAllGifts();

      const result: {
        isComplete: boolean;
        vertical: { isComplete: boolean; level: Level; price: number }[];
        horizontal: {
          isComplete: boolean;
          name: string;
          rarity: Rarity;
          price: number;
        }[];
      } = {
        isComplete: true,
        vertical: [],
        horizontal: [],
      };

      for (const data of this.vertical) {
        const giftsOfLevel = new Set(
          collection
            .filter((i) => i.level === data.level)
            .map((g) => g.gift.id),
        );
        const isComplete = giftsOfLevel.size === gifts.length;
        result.vertical.push({
          isComplete: isComplete,
          level: data.level,
          price: data.price.toNumber(),
        });
        if (!isComplete) result.isComplete = false;
      }

      for (const data of this.horizontal) {
        const levelsForGift = new Set(
          collection
            .filter(
              (i) =>
                i.level !== Level.L0 &&
                i.gift.name === data.name &&
                i.gift.rarity === data.rarity,
            )
            .map((i) => i.level),
        );
        const isComplete = levelsForGift.size === this.vertical.length;
        result.horizontal.push({
          isComplete: isComplete,
          name: data.name,
          rarity: data.rarity,
          price: data.price.toNumber(),
        });
        if (!isComplete) result.isComplete = false;
      }

      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to check collection: ', error);
      throw new HttpException('Collection check failed', 500);
    }
  }

  async craftCard(userId: string, data: CraftCardDto) {
    try {
      const [item1, item2] = await Promise.all([
        this.prisma.item.findUnique({
          where: { id: data.item1Id, userId: userId },
          select: {
            id: true,
            level: true,
            quantity: true,
            isTradeable: true,
            giftId: true,
          },
        }),
        this.prisma.item.findUnique({
          where: { id: data.item2Id, userId: userId },
          select: {
            id: true,
            level: true,
            quantity: true,
            isTradeable: true,
            giftId: true,
          },
        }),
      ]);

      if (!item1 || !item2) {
        throw new HttpException('One or both items not found', 404);
      }

      if (item1.giftId !== item2.giftId || item1.level !== item2.level) {
        throw new HttpException(
          'Items are not of the same type and level',
          400,
        );
      }

      if (item1.id === item2.id) {
        if (item1.quantity < 2) {
          throw new HttpException(
            'Insufficient quantity for crafting from the same item',
            400,
          );
        }
      } else {
        if (item1.quantity < 1 || item2.quantity < 1) {
          throw new HttpException('Insufficient quantity', 400);
        }
      }

      const level = item1.level;

      const nextLevel = this.getNextLevel(level);
      const isTradeable = item1.isTradeable && item2.isTradeable;
      if (!nextLevel) {
        throw new HttpException('Cannot craft beyond maximum level', 400);
      }

      const newItem = await this.prisma.$transaction(async (tx) => {
        if (item1.id === item2.id) {
          if (item1.quantity === 2) {
            await tx.item.delete({ where: { id: item1.id } });
          } else {
            await tx.item.update({
              where: { id: item1.id },
              data: { quantity: { decrement: 2 } },
            });
          }
        } else {
          if (item1.quantity === 1) {
            await tx.item.delete({ where: { id: item1.id } });
          } else {
            await tx.item.update({
              where: { id: item1.id },
              data: { quantity: { decrement: 1 } },
            });
          }

          if (item2.quantity === 1) {
            await tx.item.delete({ where: { id: item2.id } });
          } else {
            await tx.item.update({
              where: { id: item2.id },
              data: { quantity: { decrement: 1 } },
            });
          }
        }

        const newItem = await tx.item.findUnique({
          where: {
            userId_giftId_level_isTradeable: {
              userId: userId,
              giftId: item1.giftId,
              level: nextLevel,
              isTradeable: isTradeable,
            },
          },
        });

        if (newItem) {
          return await tx.item.update({
            where: { id: newItem.id },
            data: { quantity: { increment: 1 } },
          });
        } else {
          return await tx.item.create({
            data: {
              userId: userId,
              giftId: item1.giftId,
              level: nextLevel,
              quantity: 1,
              isTradeable: isTradeable,
            },
          });
        }
      });

      return {
        success: true,
        message: 'Card crafted successfully',
        item: newItem,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to craft card: ', error);
      throw new HttpException('Card crafting failed', 500);
    }
  }

  async getVerticalPrize(userId: string, level: Level) {
    if (this.vertical.length === 0) {
      await this.setPrices();
    }

    try {
      const collection = await this.giftService.getUserGifts(userId);
      const gifts = await this.giftService.getAllGifts();

      const vertical = this.vertical.find((v) => v.level === level);
      if (!vertical) {
        throw new HttpException('Invalid level', 400);
      }

      const giftsOfLevel = new Set(
        collection.filter((i) => i.level === level).map((g) => g.gift.id),
      );

      const isComplete = giftsOfLevel.size === gifts.length;
      if (!isComplete) {
        throw new HttpException(
          `Vertical collection for level ${level} is not complete. You have ${giftsOfLevel.size} out of ${gifts.length} gifts.`,
          400,
        );
      }

      const result = await this.prisma.$transaction(async (tx) => {
        // ✅ Increment balance
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            balance: { increment: vertical.price },
          },
          select: { id: true, balance: true },
        });

        const items = await tx.item.findMany({
          where: { userId, level },
        });

        const grouped = items.reduce<Record<string, Item[]>>((acc, item) => {
          if (!acc[item.giftId]) acc[item.giftId] = [];
          acc[item.giftId].push(item);
          return acc;
        }, {});

        for (const giftId of Object.keys(grouped)) {
          const variants = grouped[giftId];
          const target = variants.find((v) => !v.isTradeable) ?? variants[0];

          this.logger.debug(
            `Removing item ${target.id} (Gift ID: ${giftId}, Level: ${level}, Tradeable: ${target.isTradeable})`,
          );

          if (target.quantity > 1) {
            await tx.item.update({
              where: { id: target.id },
              data: { quantity: { decrement: 1 } },
            });
          } else {
            await tx.item.delete({ where: { id: target.id } });
          }
        }

        return {
          prize: vertical.price.toNumber(),
          newBalance: user.balance.toNumber(),
        };
      });

      return {
        success: true,
        message: `Vertical prize claimed for level ${level}`,
        prize: result.prize,
        newBalance: result.newBalance,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to claim vertical prize: ', error);
      throw new HttpException('Vertical prize claiming failed', 500);
    }
  }

  async getHorizontalPrize(userId: string, name: string, rarity: Rarity) {
    if (this.vertical.length === 0 || this.horizontal.length === 0) {
      await this.setPrices();
    }

    try {
      const collection = await this.giftService.getUserGifts(userId);
      const gifts = await this.giftService.getAllGifts();

      const gift = gifts.find((g) => g.name === name && g.rarity === rarity);

      if (!gift) {
        throw new HttpException('Gift not found', 404);
      }

      const horizontal = this.horizontal.find(
        (h) => h.name === name && h.rarity === rarity,
      );
      if (!horizontal) {
        throw new HttpException('Invalid gift name or rarity', 400);
      }

      const levelsForGift = new Set(
        collection
          .filter(
            (i) =>
              i.level !== Level.L0 &&
              i.gift.name === name &&
              i.gift.rarity === rarity,
          )
          .map((i) => i.level),
      );

      const isComplete = levelsForGift.size === this.vertical.length;
      if (!isComplete) {
        throw new HttpException(
          `Horizontal collection for ${name} (${rarity}) is not complete. You have ${levelsForGift.size} out of ${this.vertical.length} levels.`,
          400,
        );
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            balance: { increment: horizontal.price },
          },
          select: { id: true, balance: true },
        });

        const items = await tx.item.findMany({
          where: {
            userId,
            giftId: gift.id,
            level: { not: Level.L0 },
          },
        });

        const grouped = items.reduce<Record<Level, typeof items>>(
          (acc, item) => {
            if (!acc[item.level]) acc[item.level] = [];
            acc[item.level].push(item);
            return acc;
          },
          {} as Record<Level, typeof items>,
        );

        for (const level of Object.keys(grouped)) {
          const variants = grouped[level as Level];
          const target = variants.find((v) => !v.isTradeable) ?? variants[0];

          this.logger.debug(
            `Removing item ${target.id} (Gift ID: ${target.giftId}, Level: ${level}, Tradeable: ${target.isTradeable})`,
          );

          if (target.quantity > 1) {
            await tx.item.update({
              where: { id: target.id },
              data: { quantity: { decrement: 1 } },
            });
          } else {
            await tx.item.delete({ where: { id: target.id } });
          }
        }

        return {
          prize: horizontal.price.toNumber(),
          newBalance: user.balance.toNumber(),
        };
      });

      return {
        success: true,
        message: `Horizontal prize claimed for ${name} (${rarity})`,
        prize: result.prize,
        newBalance: result.newBalance,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to claim horizontal prize: ', error);
      throw new HttpException('Horizontal prize claiming failed', 500);
    }
  }

  async getFullPrize(userId: string) {
    if (this.vertical.length === 0 || this.horizontal.length === 0) {
      await this.setPrices();
    }

    try {
      const collection = await this.giftService.getUserGifts(userId);
      const allGifts = await this.giftService.getAllGifts();
      const levels = this.vertical.map((v) => v.level);

      for (const level of levels) {
        for (const gift of allGifts) {
          const hasGift = collection.some(
            (i) => i.level === level && i.gift.id === gift.id,
          );

          if (!hasGift) {
            throw new HttpException(
              `Missing gift ${gift.name} (${gift.rarity}) at level ${level}`,
              400,
            );
          }
        }
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: { balance: { increment: 450 } },
          select: { id: true, balance: true, referredBy: true },
        });

        // Increment referrer's balance if user was referred
        if (user.referredBy) {
          const referralBonus = this.referralService.getFullCollectionBonus();
          await tx.user.update({
            where: { id: user.referredBy },
            data: { balance: { increment: referralBonus } },
          });

          this.logger.log(
            `Referral bonus: User ${user.referredBy} earned ${referralBonus} for ${userId}'s full collection completion`,
          );
        }

        for (const level of levels) {
          for (const gift of allGifts) {
            const item = await tx.item.findFirst({
              where: {
                userId,
                giftId: gift.id,
                level,
              },
              orderBy: { isTradeable: 'asc' },
            });

            if (!item) continue;

            if (item.quantity > 1) {
              await tx.item.update({
                where: { id: item.id },
                data: { quantity: { decrement: 1 } },
              });
            } else {
              await tx.item.delete({ where: { id: item.id } });
            }
          }
        }

        return {
          prize: 450,
          newBalance: user.balance.toNumber(),
        };
      });

      return {
        success: true,
        message: 'Full collection complete — grand prize claimed!',
        prize: result.prize,
        newBalance: result.newBalance,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to claim full prize: ', error);
      throw new HttpException('Full prize claiming failed', 500);
    }
  }

  private getNextLevel(level: Level): Level | null {
    if (level === Level.L10) {
      return null;
    }
    const levels = [
      Level.L0,
      Level.L1,
      Level.L2,
      Level.L3,
      Level.L4,
      Level.L5,
      Level.L6,
      Level.L7,
      Level.L8,
      Level.L9,
      Level.L10,
    ];
    const index = levels.indexOf(level);
    return levels[index + 1];
  }

  async moveToCraftTable(userId: string, data: MoveToCraftTableDto) {
    try {
      // Check if the position is already occupied
      const craftItem = await this.prisma.craftItem.findUnique({
        where: {
          userId_positionX_positionY: {
            userId: userId,
            positionX: data.positionX,
            positionY: data.positionY,
          },
        },
      });

      if (craftItem) {
        throw new HttpException(
          'Position is already occupied on the craft table',
          400,
        );
      }

      // Find the item in the user's inventory
      const item = await this.prisma.item.findUnique({
        where: { id: data.itemId, userId: userId },
        select: {
          id: true,
          giftId: true,
          level: true,
          quantity: true,
          isTradeable: true,
        },
      });

      if (!item) {
        throw new HttpException('Item not found in inventory', 404);
      }

      if (item.quantity < 1) {
        throw new HttpException('Insufficient quantity', 400);
      }

      const result = await this.prisma.$transaction(async (tx) => {
        if (item.quantity === 1) {
          await tx.item.delete({ where: { id: item.id } });
        } else {
          await tx.item.update({
            where: { id: item.id },
            data: { quantity: { decrement: 1 } },
          });
        }

        const craftItem = await tx.craftItem.create({
          data: {
            userId: userId,
            giftId: item.giftId,
            level: item.level,
            isTradeable: item.isTradeable,
            positionX: data.positionX,
            positionY: data.positionY,
          },
          include: {
            gift: true,
          },
        });

        return craftItem;
      });

      return {
        success: true,
        message: 'Item moved to craft table successfully',
        craftItem: result,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to move item to craft table: ', error);
      throw new HttpException('Moving item to craft table failed', 500);
    }
  }

  async getCraftTable(userId: string) {
    try {
      const craftTable = await this.prisma.craftItem.findMany({
        where: { userId: userId },
        include: {
          gift: true,
        },
        orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }],
      });

      return {
        craftTable: craftTable,
        gridSize: 16,
      };
    } catch (error) {
      this.logger.error('Failed to get craft table: ', error);
      throw new HttpException('Craft table retrieval failed', 500);
    }
  }
}
