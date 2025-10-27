import { Module } from '@nestjs/common';
import { PackService } from './pack.service';
import { PackController } from './pack.controller';
import { GiftModule } from 'src/gift/gift.module';

@Module({
  imports: [GiftModule],
  providers: [PackService],
  controllers: [PackController],
})
export class PackModule {}
