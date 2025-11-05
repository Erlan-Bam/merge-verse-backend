import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { NowpaymentService } from './services/nowpayment.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [PaymentService, NowpaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
