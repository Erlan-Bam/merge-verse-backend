import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/shared/decorator/user.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { PaymentService } from './payment.service';
import { NowpaymentNotificationDto } from './dto/nowpayment.dto';

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

  @Post('nowpayment/notification')
  async nowpaymentNotification(
    @Body() data: NowpaymentNotificationDto,
    @Headers('x-nowpayments-sig') signature: string,
  ) {
    return await this.paymentService.nowpaymentNotification(data, signature);
  }
}
