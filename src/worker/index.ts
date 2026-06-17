import "dotenv/config";
import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { fetchValue, compare, toStoredValue } from "../lib/check";
import { fetchAssetPrice, evalAssetAlert, assetUnit, assetLabel } from "../lib/assets";
import { sendTelegramMessage } from "../lib/telegram";
import { createBot } from "./bot";

const BATCH_SIZE = 20;

type AssetTracker = {
  id: string;
  name: string;
  asset: string | null;
  assetCondition: "ABOVE" | "BELOW" | "PERCENT" | null;
  threshold: number | null;
  baselinePrice: number | null;
  lastValue: string | null;
  user: { telegramChatId: string | null };
};

/** Проверка одного трекера-актива: тянет цену из API и применяет условие. */
async function checkAsset(tracker: AssetTracker, now: Date, nextCheckAt: Date) {
  if (!tracker.asset || !tracker.assetCondition || tracker.threshold == null) {
    await prisma.tracker.update({
      where: { id: tracker.id },
      data: { status: "ERROR", lastError: "Некорректная настройка актива", lastCheckedAt: now, nextCheckAt },
    });
    return;
  }

  const res = await fetchAssetPrice(tracker.asset);
  if (!res.ok) {
    await prisma.tracker.update({
      where: { id: tracker.id },
      data: { status: "ERROR", lastError: res.error, lastCheckedAt: now, nextCheckAt },
    });
    return;
  }

  const current = res.price;
  const parsedPrev = tracker.lastValue != null ? Number(tracker.lastValue) : NaN;
  const lastPrice = Number.isFinite(parsedPrev) ? parsedPrev : null;

  const { alert, message, newBaseline } = evalAssetAlert(
    tracker.assetCondition,
    tracker.threshold,
    { lastPrice, baseline: tracker.baselinePrice },
    current,
    assetUnit(tracker.asset)
  );

  await prisma.snapshot.create({ data: { trackerId: tracker.id, value: String(current) } });

  if (alert) {
    await prisma.alert.create({
      data: { trackerId: tracker.id, message, oldValue: tracker.lastValue, newValue: String(current) },
    });
    if (tracker.user.telegramChatId) {
      await sendTelegramMessage(
        tracker.user.telegramChatId,
        `🔔 <b>${tracker.name}</b>\n${assetLabel(tracker.asset)}: ${message}`
      );
    }
  }

  await prisma.tracker.update({
    where: { id: tracker.id },
    data: {
      status: alert ? "CHANGED" : "OK",
      lastValue: String(current),
      // baseline нужен только для PERCENT; для порогов держим null.
      baselinePrice: tracker.assetCondition === "PERCENT" ? newBaseline : null,
      lastError: null,
      lastCheckedAt: now,
      nextCheckAt,
    },
  });
}

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
    const nextCheckAt = new Date(Date.now() + tracker.intervalMinutes * 60_000);

    // Режим ASSET: цена из API + условие (порог/процент).
    if (tracker.mode === "ASSET") {
      await checkAsset(tracker, now, nextCheckAt);
      continue;
    }

    const spec =
      tracker.mode === "PRICE"
        ? ({ mode: "PRICE" } as const)
        : ({ mode: "SELECTOR", selector: tracker.selector ?? "" } as const);
    const result = await fetchValue(tracker.url ?? "", spec);

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
          lastError:
            tracker.mode === "PRICE"
              ? "Цена не найдена — возможно, сайт подгружает её через JavaScript"
              : "Селектор не нашёл элемент на странице",
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
