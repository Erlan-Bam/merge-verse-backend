import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { GiveawayModule } from 'src/giveaway/giveaway.module';
import { SharedModule } from 'src/shared/shared.module';
import { CollectionModule } from 'src/collection/collection.module';

@Module({
  imports: [GiveawayModule, SharedModule, CollectionModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
