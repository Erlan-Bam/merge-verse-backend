import { forwardRef, Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { CronService } from './services/cron.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { BotService } from './services/bot.service';
import { ConfigService } from '@nestjs/config';
import { GiveawayModule } from 'src/giveaway/giveaway.module';
import { AuctionModule } from 'src/auction/auction.module';
import { ReferralService } from './services/referral.service';
import { EmailService } from './services/email.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '12h' },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => GiveawayModule),
    forwardRef(() => AuctionModule),
  ],
  providers: [
    PrismaService,
    BotService,
    CronService,
    JwtStrategy,
    ReferralService,
    EmailService,
  ],
  exports: [
    PrismaService,
    BotService,
    CronService,
    JwtStrategy,
    JwtModule,
    ReferralService,
    EmailService,
  ],
})
export class SharedModule {}
