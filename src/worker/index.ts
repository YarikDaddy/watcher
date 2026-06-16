import "dotenv/config";
import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { fetchValue, compare, toStoredValue } from "../lib/check";
import { sendTelegramMessage } from "../lib/telegram";
import { createBot } from "./bot";

const BATCH_SIZE = 20;

/** Один проход: берёт просроченные трекеры и проверяет их. */
async function runDueChecks() {
  const now = new Date();
  const due = await prisma.tracker.findMany({
    where: { isActive: true, nextCheckAt: { lte: now } },
    take: BATCH_SIZE,
    orderBy: { nextCheckAt: "asc" },
    include: { user: true },
  });

  if (due.length === 0) return;
  console.log(`[worker] проверяю ${due.length} трекер(ов)`);

  for (const tracker of due) {
    const result = await fetchValue(tracker.url, tracker.selector);
    const nextCheckAt = new Date(Date.now() + tracker.intervalMinutes * 60_000);

    if (!result.ok) {
      await prisma.tracker.update({
        where: { id: tracker.id },
        data: { status: "ERROR", lastError: result.error, lastCheckedAt: now, nextCheckAt },
      });
      continue;
    }

    // Для TEXT_CHANGE пустой результат = селектор не нашёл элемент: это ошибка
    // конфигурации, а не валидное значение. Иначе на следующем проходе «» → текст
    // дало бы ложный алерт. Для PRESENCE отсутствие элемента — валидное состояние.
    if (tracker.type === "TEXT_CHANGE" && !result.present) {
      await prisma.tracker.update({
        where: { id: tracker.id },
        data: {
          status: "ERROR",
          lastError: "Селектор не нашёл элемент на странице",
          lastCheckedAt: now,
          nextCheckAt,
        },
      });
      continue;
    }

    const cmp = compare(tracker.type, tracker.lastValue, result);
    const stored = toStoredValue(tracker.type, result);

    await prisma.snapshot.create({ data: { trackerId: tracker.id, value: stored } });

    if (cmp.changed) {
      await prisma.alert.create({
        data: {
          trackerId: tracker.id,
          message: cmp.message,
          oldValue: tracker.lastValue,
          newValue: stored,
        },
      });

      if (tracker.user.telegramChatId) {
        await sendTelegramMessage(
          tracker.user.telegramChatId,
          `🔔 <b>${tracker.name}</b>\n${cmp.message}\n\n${tracker.url}`
        );
      }
    }

    await prisma.tracker.update({
      where: { id: tracker.id },
      data: {
        status: cmp.changed ? "CHANGED" : "OK",
        lastValue: stored,
        lastError: null,
        lastCheckedAt: now,
        nextCheckAt,
      },
    });
  }
}

console.log("[worker] запущен, проверка каждую минуту");
cron.schedule("* * * * *", () => {
  runDueChecks().catch((err) => console.error("[worker] ошибка прохода:", err));
});

// Бот привязки Telegram работает в том же процессе (long-polling).
const bot = createBot();
if (bot) {
  bot.start({
    onStart: (info) => console.log(`[bot] запущен как @${info.username}`),
  });
}
