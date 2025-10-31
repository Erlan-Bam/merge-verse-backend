import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { GiftService } from 'src/gift/gift.service';
import { PlaceBidDto } from './dto/place-bid.dto';
import { FinishAuctionDto } from './dto/finish-auction.dto';

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);
  constructor(
    private prisma: PrismaService,
    private giftService: GiftService,
  ) {}
  async createAuction(userId: string, data: CreateAuctionDto) {
    try {
      const item = await this.prisma.item.findUnique({
        where: {
          id: data.itemId,
        },
        select: {
          id: true,
          userId: true,
          giftId: true,
          quantity: true,
          level: true,
          isTradeable: true,
          gift: {
            select: {
              rarity: true,
            },
          },
        },
      });

      if (!item || item.userId !== userId) {
        throw new HttpException('Item not found', 404);
      }

      if (!item.isTradeable) {
        throw new HttpException('Item is not tradeable', 400);
      }

      const price = await this.giftService.getGiftPrice(
        item.gift.rarity,
        item.level,
      );

      const auction = await this.prisma.$transaction(async (tx) => {
        if (item.quantity > 1) {
          await tx.item.update({
            where: { id: item.id },
            data: { quantity: { decrement: 1 } },
          });
        } else {
          await tx.item.delete({
            where: { id: item.id },
          });
        }
        return await tx.auction.create({
          data: {
            user: {
              connect: { id: item.userId },
            },
            gift: {
              connect: { id: item.giftId },
            },
            level: item.level,
            start: price.mul(1.2),
            current: price.mul(1.2),
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      });

      return auction;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to create an auction: ${error}`);
      throw new HttpException('Failed to create auction', 500);
    }
  }

  async placeBid(userId: string, data: PlaceBidDto) {
    try {
      const auction = await this.prisma.auction.findUnique({
        where: { id: data.auctionId },
        select: {
          bids: {
            orderBy: {
              amount: 'desc',
            },
            take: 1,
          },
          userId: true,
          endsAt: true,
        },
      });

      if (!auction) {
        throw new HttpException('Auction not found', 404);
      }

      if (auction.userId === userId) {
        throw new HttpException('Cannot bid on your own auction', 400);
      }

      if (!auction.endsAt || auction.endsAt < new Date()) {
        throw new HttpException('Auction has ended', 400);
      }

      const highestBid = auction.bids[0];

      if (highestBid && data.amount < highestBid.amount.toNumber()) {
        throw new HttpException(
          'Bid must be higher than current highest bid',
          400,
        );
      }

      const bid = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: {
            id: userId,
          },
          data: {
            balance: { decrement: data.amount },
          },
        });
        return await tx.bid.create({
          data: {
            auction: {
              connect: {
                id: data.auctionId,
              },
            },
            user: {
              connect: {
                id: userId,
              },
            },
            amount: data.amount,
          },
        });
      });

      return {
        status: 'Bid placed successfully',
        bid: bid,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to place a bid: ${error}`);
      throw new HttpException('Failed to place bid', 500);
    }
  }

  async finishAuction(userId: string, data: FinishAuctionDto) {
    try {
      const auction = await this.prisma.auction.findUnique({
        where: { id: data.auctionId },
        include: {
          bids: {
            orderBy: {
              amount: 'desc',
            },
          },
          user: true,
        },
      });

      if (!auction) {
        throw new HttpException('Auction not found', 404);
      }

      if (auction.userId !== userId) {
        throw new HttpException('Not authorized to finish this auction', 403);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to finish auction: ${error}`);
      throw new HttpException('Failed to finish auction', 500);
    }
  }
}
