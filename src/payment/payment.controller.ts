import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/shared/decorator/user.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PaymentService } from './payment.service';
import {
  NowpaymentNotificationDto,
  NowpaymentPayoutNotificationDto,
} from './dto/nowpayment.dto';
import { CreatePayoutDto } from './dto/create-payout.dto';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('invoice')
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'))
  async createInvoice(
    @User('id') userId: string,
    @Body() data: CreateInvoiceDto,
  ) {
    return await this.paymentService.createInvoice(userId, data);
  }

  @Post('payout')
  @ApiBearerAuth('JWT')
  @UseGuards(AuthGuard('jwt'))
  async createPayout(
    @User('id') userId: string,
    @Body() data: CreatePayoutDto,
  ) {
    return await this.paymentService.createPayout(userId, data);
  }

  @Post('nowpayment/notification')
  async nowpaymentNotification(
    @Body() data: NowpaymentNotificationDto,
    @Headers('x-nowpayments-sig') signature: string,
  ) {
    return await this.paymentService.nowpaymentNotification(data, signature);
  }

  @Post('nowpayment/payout/notification')
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
