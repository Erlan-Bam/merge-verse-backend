import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/shared/decorator/user.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PaymentService } from './payment.service';
import {
  NowpaymentNotificationDto,
  NowpaymentPayoutNotificationDto,
} from './dto/nowpayment.dto';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { InitiatePayoutDto } from './dto/initiate-payout.dto';

@Controller('payment')
@ApiTags('Payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('invoice')
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Create payment invoice',
    description:
      'Creates a new payment invoice for the authenticated user to add funds to their balance. Returns payment details including payment URL and crypto address.',
  })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully',
    schema: {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'string',
          description: 'Invoice ID',
        },
        paymentUrl: {
          type: 'string',
          description: 'URL to complete payment',
        },
        paymentAddress: {
          type: 'string',
          description: 'Cryptocurrency payment address',
        },
        amount: {
          type: 'number',
          description: 'Payment amount',
        },
        currency: {
          type: 'string',
          description: 'Payment currency',
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'WAITING', 'CONFIRMING', 'CONFIRMED', 'FAILED'],
        },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          description: 'Invoice expiration time',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid amount or currency',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createInvoice(
    @User('id') userId: string,
    @Body() data: CreateInvoiceDto,
  ) {
    return await this.paymentService.createInvoice(userId, data);
  }

  @Post('payout/initiate')
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Initiate payout request',
    description:
      'Initiates a payout request for the authenticated user. This is the first step in withdrawing funds from the user balance.',
  })
  @ApiBody({ type: InitiatePayoutDto })
  @ApiResponse({
    status: 201,
    description: 'Payout request initiated successfully',
    schema: {
      type: 'object',
      properties: {
        payoutId: {
          type: 'string',
          description: 'Payout request ID',
        },
        amount: {
          type: 'number',
          description: 'Payout amount',
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
        },
        estimatedArrival: {
          type: 'string',
          description: 'Estimated time for payout completion',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Insufficient balance or invalid amount',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async initiatePayout(
    @User('id') userId: string,
    @Body() data: InitiatePayoutDto,
  ) {
    return await this.paymentService.initiatePayout(userId, data);
  }

  @Post('payout/create')
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Create payout',
    description:
      "Creates a final payout request, deducting the amount from the user's balance and initiating the cryptocurrency transfer.",
  })
  @ApiBody({ type: CreatePayoutDto })
  @ApiResponse({
    status: 201,
    description: 'Payout created successfully',
    schema: {
      type: 'object',
      properties: {
        payoutId: {
          type: 'string',
          description: 'Payout ID',
        },
        withdrawalId: {
          type: 'string',
          description: 'External withdrawal ID from payment provider',
        },
        amount: {
          type: 'number',
          description: 'Payout amount',
        },
        currency: {
          type: 'string',
          description: 'Payout currency',
        },
        address: {
          type: 'string',
          description: 'Recipient cryptocurrency address',
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Insufficient balance or invalid payout details',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createPayout(
    @User('id') userId: string,
    @Body() data: CreatePayoutDto,
  ) {
    return await this.paymentService.createPayout(userId, data);
  }

  @Post('nowpayment/notification')
  @ApiOperation({
    summary: 'NOWPayments webhook for payment notifications',
    description:
      'Webhook endpoint for receiving payment status updates from NOWPayments. This endpoint is called by NOWPayments when a payment status changes.',
  })
  @ApiHeader({
    name: 'x-nowpayments-sig',
    description: 'NOWPayments signature for webhook verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Notification processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid signature or payload',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async nowpaymentNotification(
    @Body() data: NowpaymentNotificationDto,
    @Headers('x-nowpayments-sig') signature: string,
  ) {
    return await this.paymentService.nowpaymentNotification(data, signature);
  }

  @Post('nowpayment/payout/notification')
  @ApiOperation({
    summary: 'NOWPayments webhook for payout notifications',
    description:
      'Webhook endpoint for receiving payout status updates from NOWPayments. This endpoint is called by NOWPayments when a payout status changes.',
  })
  @ApiHeader({
    name: 'x-nowpayments-sig',
    description: 'NOWPayments signature for webhook verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Payout notification processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid signature or payload',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async nowpaymentPayoutNotification(
    @Body() data: NowpaymentPayoutNotificationDto,
    @Headers('x-nowpayments-sig') signature: string,
  ) {
    return await this.paymentService.nowpaymentPayoutNotification(
      data,
      signature,
    );
  }
}
