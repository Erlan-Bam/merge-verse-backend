import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { GiftService } from 'src/gift/gift.service';
import { PlaceBidDto } from './dto/place-bid.dto';
import { FinishAuctionDto } from './dto/finish-auction.dto';
import { AuctionStatus } from '@prisma/client';

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
      // 🔹 Quick pre-checks (non-authoritative)
      const auction = await this.prisma.auction.findUnique({
        where: { id: data.auctionId },
        select: { userId: true, status: true, endsAt: true, start: true },
      });

      if (!auction) throw new HttpException('Auction not found', 404);
      if (auction.status !== AuctionStatus.ACTIVE)
        throw new HttpException('Auction is not active', 400);
      if (!auction.endsAt || auction.endsAt < new Date())
        throw new HttpException('Auction has ended', 400);
      if (auction.userId === userId)
        throw new HttpException('Cannot bid on your own auction', 400);
      if (data.amount < auction.start.toNumber())
        throw new HttpException('Bid must be at least the starting price', 400);

      // 🔹 Transaction: all checks and balance updates happen atomically
      const bid = await this.prisma.$transaction(async (tx) => {
        // 1️⃣ Re-read fresh authoritative state inside the transaction
        const fresh = await tx.auction.findUnique({
          where: { id: data.auctionId },
          select: {
            endsAt: true,
            status: true,
            bids: { orderBy: { amount: 'desc' } },
            current: true,
            userId: true,
          },
        });

        if (!fresh) throw new HttpException('Auction not found', 404);
        if (fresh.status !== AuctionStatus.ACTIVE)
          throw new HttpException('Auction is not active', 400);
        if (!fresh.endsAt || fresh.endsAt < new Date())
          throw new HttpException('Auction has ended', 400);

        const highest = fresh.bids[0];
        const currentBid = fresh.bids.find((b) => b.userId === userId);
        const isLeading = highest?.userId === userId;

        // 2️⃣ Validate bid amounts
        if (highest && data.amount <= highest.amount.toNumber()) {
          throw new HttpException(
            'Bid must be higher than current highest bid',
            400,
          );
        }

        if (currentBid && data.amount <= currentBid.amount.toNumber()) {
          throw new HttpException(
            'New bid must be higher than your current bid',
            400,
          );
        }

        // 3️⃣ Calculate base amount to deduct
        const baseAmount = isLeading
          ? data.amount - (currentBid ? currentBid.amount.toNumber() : 0)
          : data.amount;

        if (baseAmount <= 0) {
          throw new HttpException(
            'Bid amount must be greater than current',
            400,
          );
        }

        // 💰 Always charge 10% commission
        const commission = Math.ceil(baseAmount * 0.1);
        const amountToDeduct = baseAmount + commission;

        // 4️⃣ Safe atomic balance decrement
        const decrement = await tx.user.updateMany({
          where: { id: userId, balance: { gte: amountToDeduct } },
          data: { balance: { decrement: amountToDeduct } },
        });

        if (decrement.count === 0) {
          throw new HttpException(
            'Insufficient balance to place this bid',
            400,
          );
        }

        // 5️⃣ Refund previous highest bidder (if not self)
        if (highest && highest.userId !== userId) {
          const commission = Math.ceil(highest.amount.toNumber() * 0.1);

          await tx.user.update({
            where: { id: highest.userId },
            data: {
              balance: {
                increment: highest.amount.toNumber() + commission,
              },
            },
          });
        }

        // 6️⃣ Upsert (only one bid per user per auction)
        const updatedBid = currentBid
          ? await tx.bid.update({
              where: { id: currentBid.id },
              data: { amount: data.amount },
            })
          : await tx.bid.create({
              data: {
                auction: { connect: { id: data.auctionId } },
                user: { connect: { id: userId } },
                amount: data.amount,
              },
            });

        await tx.auction.update({
          where: { id: data.auctionId },
          data: { current: data.amount },
        });

        return updatedBid;
      });

      return {
        status: 'Bid placed successfully',
        bid,
      };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      this.logger.error(`Failed to place a bid: ${e}`);
      throw new HttpException('Failed to place bid', 500);
    }
  }

  async finishAuction(userId: string, data: FinishAuctionDto) {
    try {
      const auction = await this.prisma.auction.findUnique({
        where: { id: data.auctionId },
        select: { userId: true, bids: { orderBy: { amount: 'desc' } } },
      });

      if (!auction) {
        throw new HttpException('Auction not found', 404);
      }

      if (auction.userId !== userId) {
        throw new HttpException('Not authorized to finish this auction', 403);
      }

      await this.prisma.$transaction(async (tx) => {
        const auction = await tx.auction.findUnique({
          where: { id: data.auctionId },
          select: {
            bids: { orderBy: { amount: 'desc' } },
            userId: true,
            giftId: true,
            level: true,
            start: true,
            gift: {
              select: {
                name: true,
                rarity: true,
              },
            },
          },
        });

        if (auction.bids.length > 0) {
          const wonBid = auction.bids[0];
          await tx.item.upsert({
            where: {
              userId_giftId_level_isTradeable: {
                userId: wonBid.userId,
                giftId: auction.giftId,
                level: auction.level,
                isTradeable: false,
              },
            },
            update: { quantity: { increment: 1 } },
            create: {
              userId: wonBid.userId,
              giftId: auction.giftId,
              level: auction.level,
              isTradeable: false,
              quantity: 1,
            },
          });

          await tx.history.upsert({
            where: {
              userId_giftId_level: {
                userId: wonBid.userId,
                giftId: auction.giftId,
                level: auction.level,
              },
            },
            update: {},
            create: {
              userId: wonBid.userId,
              giftId: auction.giftId,
              level: auction.level,
              name: auction.gift.name,
              rarity: auction.gift.rarity,
            },
          });

          const baseAmount = wonBid.amount.toNumber();
          const finalAmount = Math.ceil(baseAmount * 0.9);
          await tx.user.update({
            where: { id: auction.userId },
            data: {
              balance: {
                increment: finalAmount,
              },
            },
          });
          await tx.auction.update({
            where: { id: data.auctionId },
            data: {
              status: AuctionStatus.FINISHED,
            },
          });
        } else {
          await tx.item.upsert({
            where: {
              userId_giftId_level_isTradeable: {
                userId: auction.userId,
                giftId: auction.giftId,
                level: auction.level,
                isTradeable: true,
              },
            },
            update: { quantity: { increment: 1 } },
            create: {
              userId: auction.userId,
              giftId: auction.giftId,
              level: auction.level,
              isTradeable: true,
              quantity: 1,
            },
          });

          await tx.history.upsert({
            where: {
              userId_giftId_level: {
                userId: auction.userId,
                giftId: auction.giftId,
                level: auction.level,
              },
            },
            update: {},
            create: {
              userId: auction.userId,
              giftId: auction.giftId,
              level: auction.level,
              name: auction.gift.name,
              rarity: auction.gift.rarity,
            },
          });

          await tx.auction.update({
            where: { id: data.auctionId },
            data: {
              status: AuctionStatus.CANCELLED,
            },
          });
        }
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to finish auction: ${error}`);
      throw new HttpException('Failed to finish auction', 500);
    }
  }
}
