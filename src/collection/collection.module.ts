import { Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { GiftModule } from 'src/gift/gift.module';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [GiftModule, SharedModule],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService],
})
export class CollectionModule {}
