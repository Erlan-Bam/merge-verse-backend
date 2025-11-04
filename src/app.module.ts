import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { GiftModule } from './gift/gift.module';
import { UserModule } from './user/user.module';
import { PackModule } from './pack/pack.module';
import { CollectionModule } from './collection/collection.module';
import { AuctionModule } from './auction/auction.module';
import { GiveawayModule } from './giveaway/giveaway.module';
import { AdminModule } from './admin/admin.module';
import { PaymentModule } from './payment/payment.module';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ['.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().default(6001),
        DATABASE_URL: Joi.string().uri().required(),
        WEBAPP_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().min(10).required(),
      }),
      validationOptions: { allowUnknown: true, abortEarly: true },
    }),
    ScheduleModule.forRoot(),
    SharedModule,
    GiftModule,
    UserModule,
    PackModule,
    CollectionModule,
    AuctionModule,
    GiveawayModule,
    AdminModule,
    PaymentModule,
  ],
})
export class AppModule {}
