import { HttpException, Injectable, Logger } from '@nestjs/common';
import { NowpaymentService } from './services/nowpayment.service';
import { PrismaService } from 'src/shared/services/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PaymentStatus, PayoutStatus, Provider } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import {
  NowpaymentNotificationDto,
  NowpaymentPayoutNotificationDto,
} from './dto/nowpayment.dto';
import { ReferralService } from 'src/shared/services/referral.service';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { InitiatePayoutDto } from './dto/initiate-payout.dto';
import { InitiateTonPaymentDto } from './dto/initiate-ton-payment.dto';
import { EmailService } from 'src/shared/services/email.service';
import * as crypto from 'crypto';
import { TonService } from './services/ton.service';

@Injectable()
export class PaymentService {
  private readonly SUCCESS_URL: string;
  private readonly CANCEL_URL: string;
  private readonly CALLBACK_URL: string;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private nowpaymentService: NowpaymentService,
    private configService: ConfigService,
    private referralService: ReferralService,
    private emailService: EmailService,
    private tonService: TonService,
  ) {
    this.SUCCESS_URL = this.configService.get<string>('PAYMENT_SUCCESS_URL');
    this.CANCEL_URL = this.configService.get<string>('PAYMENT_CANCEL_URL');
    this.CALLBACK_URL =
      'https://merge-verse-backend-production.up.railway.app/api/payment';
  }

  async createInvoice(userId: string, data: CreateInvoiceDto) {
    try {
      const payment = await this.prisma.payment.create({
        data: {
          userId: userId,
          amount: data.amount,
          provider: Provider.NOWPAYMENTS,
        },
      });

      return await this.nowpaymentService.createInvoice({
        price_amount: Number((data.amount / 0.99).toFixed(2)),
        price_currency: 'usd',
        order_id: payment.id,
        order_description: 'Merge Verse balance top-up',
        success_url: this.SUCCESS_URL,
        cancel_url: this.CANCEL_URL,
        ipn_callback_url: `${this.CALLBACK_URL}/nowpayment/notification`,
        is_fee_paid_by_user: true,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to create invoice:', error);
      throw new HttpException('Failed to create invoice', 500);
    }
  }

  async initiateTonPayment(userId: string, data: InitiateTonPaymentDto) {
    try {
      const usd = await this.tonService.convertToUSD(data.amount);

      const payment = await this.prisma.payment.create({
        data: {
          userId: userId,
          amount: usd,
          provider: Provider.TON,
          status: PaymentStatus.PENDING,
        },
      });

      return {
        payment: payment,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to initiate TON payment:', error);
      throw new HttpException('Failed to initiate TON payment', 500);
    }
  }

  async initiatePayout(userId: string, data: InitiatePayoutDto) {
    try {
      // Get user with email
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { email: true },
      });

      if (!user) {
        throw new HttpException('User not found', 404);
      }

      if (!user.email) {
        throw new HttpException(
          'Email not found. Please add and verify your email first',
          400,
        );
      }

      if (!user.email.isVerified) {
        throw new HttpException(
          'Email not verified. Please verify your email first',
          400,
        );
      }

      if (!user.cryptoWallet) {
        throw new HttpException(
          'Crypto wallet not found. Please add your crypto wallet address first',
          400,
        );
      }

      // Validate the crypto wallet address
      const isValid = await this.nowpaymentService.validate(user.cryptoWallet);
      if (!isValid) {
        throw new HttpException(
          'Invalid crypto wallet address in your profile',
          400,
        );
      }

      // Check if user has sufficient balance (including fees)
      const fee = await this.nowpaymentService.getPayoutFee(
        data.amount,
        'usdt',
      );
      const totalAmount = data.amount / 0.94 + fee;

      if (user.balance.toNumber() < totalAmount) {
        throw new HttpException('Insufficient balance', 400);
      }

      // Generate 6-digit code
      const code = crypto.randomInt(100000, 999999).toString();

      // Create a pending payout record and update email with code
      await this.prisma.$transaction(async (tx) => {
        await tx.payout.create({
          data: {
            userId: userId,
            amount: data.amount,
            status: PayoutStatus.PENDING,
          },
        });

        await tx.email.update({
          where: { userId: userId },
          data: { code },
        });
      });

      // Send payout code via email
      await this.emailService.sendPayoutCodeEmail(
        user.email.email,
        code,
        data.amount,
      );

      this.logger.log(
        `Payout initiated for user ${userId}, amount: ${data.amount}`,
      );

      return {
        status: 'ok',
        message: 'Payout code sent to your email',
        email: user.email.email,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to initiate payout:', error);
      throw new HttpException('Failed to initiate payout', 500);
    }
  }

  async createPayout(userId: string, data: CreatePayoutDto) {
    try {
      // Get user with email
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { email: true },
      });

      if (!user) {
        throw new HttpException('User not found', 404);
      }

      if (!user.email) {
        throw new HttpException('Email not found', 400);
      }

      if (!user.email.isVerified) {
        throw new HttpException('Email not verified', 400);
      }

      if (!user.email.code) {
        throw new HttpException(
          'No payout code found. Please initiate payout first',
          400,
        );
      }

      if (!user.cryptoWallet) {
        throw new HttpException('Crypto wallet not found', 400);
      }

      // Verify the code
      if (user.email.code !== data.code) {
        throw new HttpException('Invalid payout code', 400);
      }

      // Find the most recent pending payout for this user
      const pendingPayout = await this.prisma.payout.findFirst({
        where: {
          userId: userId,
          status: PayoutStatus.PENDING,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!pendingPayout) {
        throw new HttpException(
          'No pending payout found. Please initiate payout first',
          400,
        );
      }

      const amount = pendingPayout.amount.toNumber();

      // Recalculate fees and total amount
      const fee = await this.nowpaymentService.getPayoutFee(amount, 'usdt');
      const totalAmount = amount / 0.94 + fee;

      await this.prisma.$transaction(async (tx) => {
        const decrement = await tx.user.updateMany({
          where: {
            id: userId,
            balance: { gte: totalAmount },
          },
          data: {
            balance: { decrement: totalAmount },
          },
        });

        if (decrement.count === 0) {
          throw new HttpException(
            'Insufficient balance or concurrent modification',
            400,
          );
        }

        // Update payout status to PROCESSING
        await tx.payout.update({
          where: { id: pendingPayout.id },
          data: { status: PayoutStatus.PROCESSING },
        });

        // Send payout to payment provider
        await this.nowpaymentService.createPayout({
          address: user.cryptoWallet,
          amount: totalAmount,
          currency: 'usdt',
          unique_external_id: pendingPayout.id,
          ipn_callback_url: `${this.CALLBACK_URL}/nowpayment/payout/notification`,
        });

        // Clear the code after successful payout creation
        await tx.email.update({
          where: { userId: userId },
          data: { code: null },
        });
      });

      return { status: 'ok', message: 'Payout created successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to create payout:', error);
      throw new HttpException('Failed to create payout', 500);
    }
  }

  async nowpaymentNotification(
    data: NowpaymentNotificationDto,
    signature: string,
  ) {
    try {
      const isValid = await this.nowpaymentService.verifySignature(
        data,
        signature,
      );
      if (!isValid) {
        this.logger.warn('Invalid signature for notification', {
          payment_id: data.payment_id,
        });
        throw new HttpException('Invalid signature', 403);
      }

      if (data.payment_status !== 'finished') {
        this.logger.log(
          `Payment ${data.payment_id} status: ${data.payment_status}`,
        );
        return { status: 'ok', message: 'Payment not finished yet' };
      }

      if (!data.order_id) {
        this.logger.error('Missing order_id in notification', data);
        throw new HttpException('Missing order_id', 400);
      }

      const payment = await this.prisma.payment.findUnique({
        where: { id: data.order_id },
        include: { user: true },
      });

      if (!payment) {
        this.logger.error(`Payment not found: ${data.order_id}`);
        throw new HttpException('Payment not found', 404);
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        this.logger.warn(`Payment already completed: ${data.order_id}`);
        return { status: 'ok', message: 'Payment already processed' };
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            externalId: data.payment_id.toString(),
          },
        });

        // Update user balance
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            balance: {
              increment: payment.amount,
            },
          },
        });

        // Process referral commissions
        const referrals = await this.referralService.processDepositReferrals(
          payment.userId,
          payment.amount.toNumber(),
        );

        // First level referral (direct referrer) - 4%
        if (referrals.firstLevel) {
          await tx.user.update({
            where: { id: referrals.firstLevel.userId },
            data: {
              balance: { increment: referrals.firstLevel.amount },
            },
          });

          this.logger.log(
            `First level referral: User ${referrals.firstLevel.userId} earned ${referrals.firstLevel.amount} from ${payment.userId}'s deposit`,
          );
        }

        // Second level referral (referrer of referrer) - 2%
        if (referrals.secondLevel) {
          await tx.user.update({
            where: { id: referrals.secondLevel.userId },
            data: {
              balance: { increment: referrals.secondLevel.amount },
            },
          });

          this.logger.log(
            `Second level referral: User ${referrals.secondLevel.userId} earned ${referrals.secondLevel.amount} from ${payment.userId}'s deposit`,
          );
        }

        this.logger.log(
          `Payment completed: ${payment.id}, User: ${payment.userId}, Amount: ${payment.amount}`,
        );
      });

      return {
        status: 'ok',
        message: 'Payment processed successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to process notification:', error);
      throw new HttpException('Failed to process notification', 500);
    }
  }

  async nowpaymentPayoutNotification(
    data: NowpaymentPayoutNotificationDto,
    signature: string,
  ) {
    try {
      const isValid = await this.nowpaymentService.verifySignature(
        data,
        signature,
      );
      if (!isValid) {
        this.logger.warn('Invalid signature for notification', {
          payout_id: data.unique_external_id,
        });
        throw new HttpException('Invalid signature', 403);
      }

      if (data.status.toLowerCase() === 'failed') {
        if (!data.unique_external_id) {
          this.logger.error('Missing unique_external_id in notification', data);
          throw new HttpException('Missing unique_external_id', 400);
        }
        await this.prisma.$transaction(async (tx) => {
          const payout = await tx.payout.update({
            where: { id: data.unique_external_id },
            data: { status: PayoutStatus.FAILED },
          });
          await tx.user.update({
            where: { id: payout.userId },
            data: { balance: { increment: payout.amount } },
          });
        });
      }

      if (data.status.toLowerCase() !== 'finished') {
        this.logger.log(`Payment ${data.id} status: ${data.status}`);
        return { status: 'ok', message: 'Payment not finished yet' };
      }

      if (!data.unique_external_id) {
        this.logger.error('Missing unique_external_id in notification', data);
        throw new HttpException('Missing unique_external_id', 400);
      }

      const payout = await this.prisma.payout.findUnique({
        where: { id: data.unique_external_id },
        include: { user: true },
      });

      if (!payout) {
        this.logger.error(`Payment not found: ${data.unique_external_id}`);
        throw new HttpException('Payment not found', 404);
      }

      if (payout.status !== PayoutStatus.PROCESSING) {
        this.logger.warn(
          `Payment already completed: ${data.unique_external_id}`,
        );
        return { status: 'ok', message: 'Payment already processed' };
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.payout.update({
          where: { id: payout.id },
          data: {
            status: PayoutStatus.COMPLETED,
            externalId: data.id.toString(),
          },
        });
      });

      return {
        status: 'ok',
        message: 'Payment processed successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to process notification:', error);
      throw new HttpException('Failed to process notification', 500);
    }
  }
}
