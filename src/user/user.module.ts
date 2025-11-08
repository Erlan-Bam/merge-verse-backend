import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { SharedModule } from 'src/shared/shared.module';
import { CollectionModule } from 'src/collection/collection.module';

@Module({
  imports: [SharedModule, CollectionModule],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
