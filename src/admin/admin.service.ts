import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(private prisma: PrismaService) {}
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
}
