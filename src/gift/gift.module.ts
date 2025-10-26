import { Module } from '@nestjs/common';
import { GiftService } from './gift.service';
import { GiftController } from './gift.controller';

@Module({
  providers: [GiftService],
  controllers: [GiftController]
})
export class GiftModule {}
