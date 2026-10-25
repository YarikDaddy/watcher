import { webhookCallback } from "grammy";
import { createBot } from "@/lib/bot";

// Вебхук Telegram-бота: в проде бот живёт здесь, без отдельного процесса.
// Telegram присылает заголовок X-Telegram-Bot-Api-Secret-Token — grammY
// сверяет его с TELEGRAM_WEBHOOK_SECRET и отклоняет чужие запросы.
export const dynamic = "force-dynamic";

const bot = createBot();
const handle = bot
  ? webhookCallback(bot, "std/http", {
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
      onTimeout: "return",
      timeoutMilliseconds: 9_000,
    })
  : null;

export async function POST(req: Request) {
  if (!handle) return new Response("Bot not configured", { status: 503 });
  if (!process.env.TELEGRAM_WEBHOOK_SECRET) return new Response("Webhook secret not set", { status: 503 });
  return handle(req);
}
