import { Module } from '@nestjs/common';
import { GiveawayController } from './giveaway.controller';
import { GiveawayService } from './giveaway.service';
import { GiftModule } from 'src/gift/gift.module';

@Module({
  imports: [GiftModule],
  controllers: [GiveawayController],
  providers: [GiveawayService],
  exports: [GiveawayService],
})
export class GiveawayModule {}
