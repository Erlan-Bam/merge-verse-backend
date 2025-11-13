import { HttpException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/shared/services/prisma.service';
import { TelegramAuthDto } from './dto/telegram-auth.dto';
import { validateTelegramWebAppData } from './utils/telegram.utils';
import { CreateEmailDto } from './dto/create-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateCryptoWalletDto } from './dto/update-crypto-wallet.dto';
import { EmailService } from 'src/shared/services/email.service';
import * as crypto from 'crypto';

@Injectable()
export class UserService {
  private logger = new Logger(UserService.name);
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}
  async generateToken(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          isBanned: true,
        },
      });

      if (!user) {
        throw new HttpException('User not found', 404);
      }

      const payload = {
        id: user.id,
        isBanned: user.isBanned,
      };

      return this.jwtService.sign(payload);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Failed to generate token: ', error);
      throw new HttpException('Failed to generate token', 500);
    }
  }

  async getProfile(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          telegramId: true,
          role: true,
          isBanned: true,
          balance: true,
          cryptoWallet: true,
          email: {
            select: {
              email: true,
              isVerified: true,
            },
          },
        },
      });

      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Failed to get user profile: ', error);
      throw new HttpException('Failed to get user profile', 500);
    }
  }

  async telegram(data: TelegramAuthDto): Promise<{ accessToken: string }> {
    try {
      const botToken =
        this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');

      this.logger.debug('Validating Telegram initData...');
      const parsedData = validateTelegramWebAppData(data.initData, botToken);
      this.logger.debug(`Telegram user authenticated: ${parsedData.user.id}`);

      if (!parsedData.user || !parsedData.user.id) {
        throw new HttpException('Invalid user data', 400);
      }

      const telegramId = String(parsedData.user.id);

      const user = await this.prisma.user.upsert({
        where: { telegramId },
        update: {},
        create: {
          telegramId,
        },
        select: {
          id: true,
          telegramId: true,
          role: true,
          isBanned: true,
        },
      });

      if (user.isBanned) {
        throw new HttpException('User is banned', 403);
      }

      const payload = {
        id: user.id,
        isBanned: user.isBanned,
      };

      const accessToken = this.jwtService.sign(payload);

      return { accessToken: accessToken };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Failed to authenticate with Telegram: ', error);

      throw new HttpException('Failed to authenticate', 500);
    }
  }

  async getCollectionHistory(userId: string) {
    try {
      // Query all gifts ordered by rarity (COMMON to MYTHIC) then by name
      const gifts = await this.prisma.gift.findMany({
        orderBy: [
          { rarity: 'asc' }, // COMMON, RARE, EPIC, LEGENDARY, MYTHIC
          { name: 'asc' },
        ],
      });

      // Get user's history for quick lookup
      const userHistory = await this.prisma.history.findMany({
        where: { userId },
      });

      // Create a lookup map for faster access: "giftId-level" -> history entry
      const historyMap = new Map(
        userHistory.map((h) => [`${h.giftId}-${h.level}`, h]),
      );

      // Define levels L1 to L10
      const levels = [
        'L1',
        'L2',
        'L3',
        'L4',
        'L5',
        'L6',
        'L7',
        'L8',
        'L9',
        'L10',
      ];

      // Build the grid: 20 gifts (rows) × 10 levels (columns)
      const grid = [];

      gifts.forEach((gift, giftIndex) => {
        levels.forEach((level, levelIndex) => {
          const historyEntry = historyMap.get(`${gift.id}-${level}`);

          grid.push({
            name: gift.name,
            rarity: gift.rarity,
            level: level,
            row: giftIndex, // 0-19 for 20 gifts
            column: levelIndex, // 0-9 for L1-L10
            userId: historyEntry ? userId : null, // null if user doesn't own it
          });
        });
      });

      return { history: grid };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Failed to get collection history: ', error);
      throw new HttpException('Failed to get collection history', 500);
    }
  }

  async createEmail(userId: string, createEmailDto: CreateEmailDto) {
    try {
      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { email: true },
      });

      if (!user) {
        throw new HttpException('User not found', 404);
      }

      // Check if user already has an email
      if (user.email) {
        throw new HttpException(
          'User already has an email associated with their account',
          400,
        );
      }

      // Check if email is already taken by another user
      const existingEmail = await this.prisma.email.findUnique({
        where: { email: createEmailDto.email },
      });

      if (existingEmail) {
        throw new HttpException(
          'This email is already associated with another account',
          400,
        );
      }

      // Generate a 6-digit verification code
      const verificationCode = crypto.randomInt(100000, 999999).toString();

      // Create email record with verification code
      const email = await this.prisma.email.create({
        data: {
          userId,
          email: createEmailDto.email,
          code: verificationCode,
          isVerified: false,
        },
      });

      // Send verification email with timeout
      const emailTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email sending timeout')), 10000),
      );

      await Promise.race([
        this.emailService.sendVerificationEmail(
          createEmailDto.email,
          verificationCode,
        ),
        emailTimeout,
      ]);

      return {
        message: 'Verification code sent to your email',
        email: email.email,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Failed to create email: ', error);
      throw new HttpException('Failed to create email', 500);
    }
  }

  async resendVerificationCode(userId: string) {
    try {
      // Find the user's email record
      const emailRecord = await this.prisma.email.findUnique({
        where: { userId },
      });

      if (!emailRecord) {
        throw new HttpException(
          'No email found for this user. Please create an email first',
          404,
        );
      }

      // Check if email is already verified
      if (emailRecord.isVerified) {
        throw new HttpException('Email is already verified', 400);
      }

      // Generate a new 6-digit verification code
      const verificationCode = crypto.randomInt(100000, 999999).toString();

      // Update email record with new verification code
      await this.prisma.email.update({
        where: { userId },
        data: {
          code: verificationCode,
        },
      });

      // Send verification email with timeout
      const emailTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email sending timeout')), 10000),
      );

      await Promise.race([
        this.emailService.sendVerificationEmail(
          emailRecord.email,
          verificationCode,
        ),
        emailTimeout,
      ]);

      return {
        message: 'Verification code resent to your email',
        email: emailRecord.email,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Failed to resend verification code: ', error);
      throw new HttpException('Failed to resend verification code', 500);
    }
  }

  async verifyEmail(userId: string, verifyEmailDto: VerifyEmailDto) {
    try {
      // Find the user's email record
      const emailRecord = await this.prisma.email.findUnique({
        where: { userId },
      });

      if (!emailRecord) {
        throw new HttpException('No email found for this user', 404);
      }

      // Check if email is already verified
      if (emailRecord.isVerified) {
        throw new HttpException('Email is already verified', 400);
      }

      // Check if verification code exists
      if (!emailRecord.code) {
        throw new HttpException(
          'No verification code found. Please request a new code',
          400,
        );
      }

      // Verify the code matches
      if (emailRecord.code !== verifyEmailDto.code) {
        throw new HttpException('Invalid verification code', 400);
      }

      // Update email record - mark as verified and remove the code
      const verifiedEmail = await this.prisma.email.update({
        where: { userId },
        data: {
          isVerified: true,
          code: null, // Remove the code after successful verification
        },
      });

      return {
        message: 'Email verified successfully',
        email: verifiedEmail.email,
        isVerified: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Failed to verify email: ', error);
      throw new HttpException('Failed to verify email', 500);
    }
  }

  async upsertCryptoWallet(
    userId: string,
    updateCryptoWalletDto: UpdateCryptoWalletDto,
  ) {
    try {
      // Upsert the crypto wallet - creates or updates
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          cryptoWallet: updateCryptoWalletDto.cryptoWallet,
        },
        select: {
          id: true,
          cryptoWallet: true,
        },
      });

      return {
        message: 'Crypto wallet updated successfully',
        cryptoWallet: updatedUser.cryptoWallet,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Failed to update crypto wallet: ', error);
      throw new HttpException('Failed to update crypto wallet', 500);
    }
  }
}
