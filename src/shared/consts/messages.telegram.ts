export const TELEGRAM_MESSAGES = {
  ru: {
    winner: {
      userNotFound: '❌ Пользователь не найден',
      winnerNotFound: '❌ Запись победителя не найдена',
      alreadyChosen: '❌ Вы уже сделали выбор',
      choiceConfirmed: '✅ *Выбор подтвержден!*',
      giftLabel: '🎁 Получить подарок',
      compensationLabel: '💵 Компенсация',
      adminWillContact: (isGift: boolean) =>
        `Администратор свяжется с вами в ближайшее время для оформления ${isGift ? 'подарка' : 'компенсации'}.`,
      choiceFixed: (choiceText: string) =>
        `Ваш выбор зафиксирован: ${choiceText}`,
      confirmationMessage: (
        giftName: string,
        choiceText: string,
        isGift: boolean,
      ) =>
        `✅ *Выбор подтвержден!*\n\n` +
        `Подарок: ${giftName}\n` +
        `Ваш выбор: ${choiceText}\n\n` +
        `Администратор свяжется с вами в ближайшее время для оформления ${isGift ? 'подарка' : 'компенсации'}.`,
      error: '❌ Произошла ошибка. Попробуйте позже.',
    },
  },
} as const;

// Helper to get messages for a specific language
export const getMessages = (lang: 'ru' = 'ru') => TELEGRAM_MESSAGES[lang];
