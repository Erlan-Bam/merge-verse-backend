import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { NowpaymentService } from './services/nowpayment.service';

@Module({
  providers: [PaymentService, NowpaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
