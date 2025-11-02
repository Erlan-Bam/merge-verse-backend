// bot.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard } from 'grammy';
import { PrismaService } from './prisma.service';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot: Bot;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const token = this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    this.bot = new Bot(token);

    this.bot.catch((err) => {
      const e = err.error as Error;
      this.logger.error('grammY error', e);
    });

    this.setup();
  }

  private setup() {
    this.bot.command('start', async (ctx) => {
      const url = this.configService.getOrThrow('WEBAPP_URL');

      const keyboard = new InlineKeyboard().webApp('🎮 Open MergeVerse', url);

      const welcomeMessage = `
🎉 *Welcome to MergeVerse!* 🎉

Dive into an exciting world of merging and strategy! 

✨ *What awaits you:*
🔹 Merge items to create powerful combinations
🔹 Build and upgrade your unique collection
🔹 Compete with players worldwide
🔹 Unlock rare rewards and achievements

🚀 Ready to start your adventure?
Click the button below to launch the game!
      `.trim();

      const telegramId = ctx.from.id;

      await Promise.all([
        await this.prisma.user.upsert({
          where: { telegramId: telegramId.toString() },
          update: {},
          create: { telegramId: telegramId.toString() },
        }),
        await ctx.reply(welcomeMessage, {
          reply_markup: keyboard,
          parse_mode: 'Markdown',
        }),
      ]);
    });
  }

  async onModuleInit() {
    try {
      this.bot.start({
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query'],
        onStart: () => {
          this.logger.log('Telegram bot launched');
        },
      });
    } catch (error) {
      this.logger.error('Failed to launch Telegram bot', error as Error);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.bot.stop();
    this.logger.log('Telegram bot stopped');
  }

  /**
   * Send a message to a specific user
   */
  async sendMessage(telegramId: string, text: string) {
    try {
      await this.bot.api.sendMessage(telegramId, text, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      this.logger.error(`Failed to send message to ${telegramId}:`, error);
      throw error;
    }
  }
}
