import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { GiveawayModule } from 'src/giveaway/giveaway.module';

@Module({
  imports: [GiveawayModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
