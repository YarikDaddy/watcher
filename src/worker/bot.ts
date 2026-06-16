import { Bot } from "grammy";
import { prisma } from "../lib/prisma";

/**
 * Telegram-бот привязки аккаунта.
 *
 * Поток: на дашборде пользователь жмёт «Подключить Telegram» → открывается
 * t.me/<bot>?start=<token> → боту приходит `/start <token>` → находим юзера по
 * telegramLinkToken, сохраняем chatId и гасим токен (одноразовый).
 */
export function createBot(): Bot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[bot] TELEGRAM_BOT_TOKEN не задан — бот не запущен");
    return null;
  }

  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    const payload = ctx.match?.trim();
    const chatId = String(ctx.chat.id);

    if (!payload) {
      await ctx.reply(
        "Привет! Это бот Watcher.\n\nЧтобы получать алерты, откройте дашборд и нажмите «Подключить Telegram»."
      );
      return;
    }

    const user = await prisma.user.findUnique({
      where: { telegramLinkToken: payload },
    });

    if (!user) {
      await ctx.reply(
        "Ссылка недействительна или устарела. Сгенерируйте новую на дашборде."
      );
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: chatId, telegramLinkToken: null },
    });

    await ctx.reply(
      "✅ Готово! Telegram привязан — сюда будут приходить алерты Watcher."
    );
  });

  bot.command("stop", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const { count } = await prisma.user.updateMany({
      where: { telegramChatId: chatId },
      data: { telegramChatId: null },
    });
    await ctx.reply(
      count > 0
        ? "Telegram отвязан. Алерты больше не будут приходить."
        : "Этот чат не привязан ни к одному аккаунту."
    );
  });

  bot.catch((err) => console.error("[bot] ошибка:", err));

  return bot;
}
