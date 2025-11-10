import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { NowpaymentService } from './services/nowpayment.service';
import { SharedModule } from 'src/shared/shared.module';
import { TonService } from './services/ton.service';

@Module({
  imports: [SharedModule],
  providers: [PaymentService, NowpaymentService, TonService],
  controllers: [PaymentController],
})
export class PaymentModule {}
