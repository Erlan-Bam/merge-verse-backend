import { HttpException, Injectable, Logger } from '@nestjs/common';
import { NowpaymentService } from './services/nowpayment.service';
import { PrismaService } from 'src/shared/services/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PaymentStatus, Provider } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { NowpaymentNotificationDto } from './dto/nowpayment.dto';

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
          provider: data.provider,
        },
      });

      if (data.provider === Provider.NOWPAYMENTS) {
        return await this.nowpaymentService.createInvoice({
          price_amount: data.amount,
          price_currency: 'usd',
          order_id: payment.id,
          order_description: 'Merge Verse balance top-up',
          success_url: this.SUCCESS_URL,
          cancel_url: this.CANCEL_URL,
          ipn_callback_url: `${this.CALLBACK_URL}/nowpayment/notification`,
        });
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to create invoice:', error);
      throw new HttpException('Failed to create invoice', 500);
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

        await tx.user.update({
          where: { id: payment.userId },
          data: {
            balance: {
              increment: payment.amount,
            },
          },
        });

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
}
