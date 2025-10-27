import { Module } from '@nestjs/common';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { GiftModule } from 'src/gift/gift.module';

@Module({
  imports: [GiftModule],
  controllers: [CollectionController],
  providers: [CollectionService],
})
export class CollectionModule {}
