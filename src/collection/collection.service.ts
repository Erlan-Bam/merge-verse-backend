import { HttpException, Injectable, Logger } from '@nestjs/common';
import { HorizontalPrice, Level, Rarity, VerticalPrice } from '@prisma/client';
import { GiftService } from 'src/gift/gift.service';
import { PrismaService } from 'src/shared/services/prisma.service';
import { CraftCardDto } from './dto/craft-card.dto';

@Injectable()
export class CollectionService {
  private vertical: VerticalPrice[] = [];
  private horizontal: HorizontalPrice[] = [];
  private readonly logger = new Logger(CollectionService.name);
  constructor(
    private giftService: GiftService,
    private prisma: PrismaService,
  ) {
    this.setPrices().catch((error) => {
      this.logger.error(error);
    });
  }

  private async setPrices(): Promise<void> {
    try {
      this.vertical = await this.prisma.verticalPrice.findMany();
      this.horizontal = await this.prisma.horizontalPrice.findMany();
    } catch (error) {
      this.logger.error('Failed to get price data: ', error);
    }
  }

  async getCollection(userId: string) {
    try {
      const collection = await this.giftService.getUserGifts(userId);

      return { collection: collection };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to get collection: ', error);
      throw error;
    }
  }

  async checkCollection(userId: string) {
    if (this.vertical.length === 0 || this.horizontal.length === 0) {
      await this.setPrices();
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
      throw error;
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

        // Ищем существующий item с nextLevel
        const newItem = await tx.item.findFirst({
          where: {
            userId: userId,
            giftId: item1.giftId,
            level: nextLevel,
            isTradeable: isTradeable,
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
      throw error;
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
}
