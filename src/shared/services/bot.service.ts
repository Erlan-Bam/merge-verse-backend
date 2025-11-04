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
import { getMessages } from '../consts/messages.telegram';

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

    // Handle callback queries for winner choice
    this.bot.callbackQuery(/^winner_choice:(.+):(.+)$/, async (ctx) => {
      try {
        const [_, winnerId, choice] = ctx.match as RegExpMatchArray;
        const telegramId = ctx.from.id.toString();
        const messages = getMessages('ru');

        // Verify user
        const user = await this.prisma.user.findUnique({
          where: { telegramId },
        });

        if (!user) {
          await ctx.answerCallbackQuery({
            text: messages.winner.userNotFound,
            show_alert: true,
          });
          return;
        }

        // Verify winner
        const winner = await this.prisma.winner.findUnique({
          where: { id: winnerId },
          include: {
            giveaway: {
              include: {
                gift: true,
              },
            },
          },
        });

        if (!winner || winner.userId !== user.id) {
          await ctx.answerCallbackQuery({
            text: messages.winner.winnerNotFound,
            show_alert: true,
          });
          return;
        }

        if (winner.choice !== 'PENDING') {
          await ctx.answerCallbackQuery({
            text: messages.winner.alreadyChosen,
            show_alert: true,
          });
          return;
        }

        // Update winner choice
        await this.prisma.winner.update({
          where: { id: winnerId },
          data: {
            choice: choice === 'gift' ? 'GIFT' : 'COMPENSATION',
          },
        });

        const isGift = choice === 'gift';
        const name = winner.giveaway.gift.name;
        const choiceText = isGift
          ? messages.winner.giftLabel
          : messages.winner.compensationLabel;

        await ctx.editMessageText(
          messages.winner.confirmationMessage(name, choiceText, isGift),
          { parse_mode: 'Markdown' },
        );

        await ctx.answerCallbackQuery({
          text: messages.winner.choiceFixed(choiceText),
        });
      } catch (error) {
        const messages = getMessages('ru');
        this.logger.error('Failed to handle winner choice:', error);
        await ctx.answerCallbackQuery({
          text: messages.winner.error,
          show_alert: true,
        });
      }
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

  /**
   * Send winner notification with choice buttons
   */
  async sendWinnerNotification(
    telegramId: string,
    winnerId: string,
    name: string,
    rarity: string,
  ) {
    try {
      const keyboard = new InlineKeyboard()
        .text('🎁 Получить подарок', `winner_choice:${winnerId}:gift`)
        .text('💵 Компенсация', `winner_choice:${winnerId}:compensation`);

      const message = `
🎉 *Поздравляем! Вы победили в розыгрыше!* 🎉

🎁 *Подарок:* ${name}
💎 *Редкость:* ${rarity}

Пожалуйста, выберите один из вариантов:

🎁 *Получить подарок* — бот отправит запрос в админ-панель с вашими данными. Администратор свяжется с вами для отправки подарка.

💵 *Компенсация* — бот отправит запрос в админ-панель для оформления денежной компенсации. Способ начисления будет согласован с вами индивидуально.

⚠️ *Важно:* После выбора изменить решение будет невозможно.
      `.trim();

      await this.bot.api.sendMessage(telegramId, message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown',
      });

      this.logger.log(`Winner notification sent to ${telegramId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send winner notification to ${telegramId}:`,
        error,
      );
      throw error;
    }
  }
}
