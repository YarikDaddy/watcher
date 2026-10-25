import { Bot, type Context } from "grammy";
import { prisma } from "./prisma";
import { getDictForLocale } from "./i18n";
import { buildStatusText } from "./digest";

/**
 * Telegram-бот Watcher. Один и тот же бот работает двумя способами:
 * вебхук на Vercel (/api/telegram) в проде и long-polling в `npm run worker`.
 *
 * Привязка: на дашборде «Подключить Telegram» → t.me/<bot>?start=<token> →
 * `/start <token>` → находим юзера по telegramLinkToken, сохраняем chatId и
 * гасим токен (одноразовый).
 */

/** Язык ответа: язык аккаунта, если чат привязан, иначе язык Telegram-клиента. */
async function dictFor(ctx: Context) {
  const chatId = ctx.chat ? String(ctx.chat.id) : null;
  const user = chatId
    ? await prisma.user.findFirst({ where: { telegramChatId: chatId }, select: { id: true, locale: true } })
    : null;
  const lang = user?.locale ?? (ctx.from?.language_code?.startsWith("ru") ? "ru" : "en");
  return { user, dict: getDictForLocale(lang) };
}

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
      const { dict } = await dictFor(ctx);
      await ctx.reply(dict.bot.welcome);
      return;
    }

    const user = await prisma.user.findUnique({ where: { telegramLinkToken: payload } });
    if (!user) {
      const { dict } = await dictFor(ctx);
      await ctx.reply(dict.bot.linkInvalid);
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { telegramChatId: chatId, telegramLinkToken: null },
    });
    await ctx.reply(getDictForLocale(user.locale).bot.linked);
  });

  bot.command("status", async (ctx) => {
    const { user, dict } = await dictFor(ctx);
    if (!user) {
      await ctx.reply(dict.bot.notLinked);
      return;
    }
    await ctx.reply(await buildStatusText(user.id, dict), {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  });

  bot.command("help", async (ctx) => {
    const { dict } = await dictFor(ctx);
    await ctx.reply(dict.bot.help);
  });

  bot.command("stop", async (ctx) => {
    const { dict } = await dictFor(ctx);
    const { count } = await prisma.user.updateMany({
      where: { telegramChatId: String(ctx.chat.id) },
      data: { telegramChatId: null },
    });
    await ctx.reply(count > 0 ? dict.bot.unlinked : dict.bot.notLinked);
  });

  bot.catch((err) => console.error("[bot] ошибка:", err));

  return bot;
}
