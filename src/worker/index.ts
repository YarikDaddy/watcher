import "dotenv/config";
import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { fetchValue, compare, comparisonMessage, toStoredValue, checkErrorMessage } from "../lib/check";
import {
  fetchAssetPrice,
  evalAssetAlert,
  assetAlertMessage,
  assetUnit,
  assetLabel,
  type AssetPriceResult,
} from "../lib/assets";
import { fetchCertInfo, evalCertAlert, certAlertMessage, hostnameFromUrl } from "../lib/cert";
import { sendTelegramMessage } from "../lib/telegram";
import { getDictForLocale, type Dict } from "../lib/i18n";
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
async function checkAsset(
  tracker: AssetTracker,
  now: Date,
  nextCheckAt: Date,
  priceCache: Map<string, AssetPriceResult>,
  dict: Dict
) {
  if (!tracker.asset || !tracker.assetCondition || tracker.threshold == null) {
    await prisma.tracker.update({
      where: { id: tracker.id },
      data: { status: "ERROR", lastError: dict.errors.assetMisconfig, lastCheckedAt: now, nextCheckAt },
    });
    return;
  }

  // Один запрос на актив за проход: несколько трекеров на BTC = один вызов API.
  let res = priceCache.get(tracker.asset);
  if (!res) {
    res = await fetchAssetPrice(tracker.asset);
    priceCache.set(tracker.asset, res);
  }
  if (!res.ok) {
    await prisma.tracker.update({
      where: { id: tracker.id },
      data: {
        status: "ERROR",
        lastError: checkErrorMessage(res.error, dict.errors),
        lastCheckedAt: now,
        nextCheckAt,
      },
    });
    return;
  }

  const current = res.price;
  const parsedPrev = tracker.lastValue != null ? Number(tracker.lastValue) : NaN;
  const lastPrice = Number.isFinite(parsedPrev) ? parsedPrev : null;

  const ev = evalAssetAlert(
    tracker.assetCondition,
    tracker.threshold,
    { lastPrice, baseline: tracker.baselinePrice },
    current
  );

  await prisma.snapshot.create({ data: { trackerId: tracker.id, value: String(current) } });

  if (ev.alert) {
    const message = assetAlertMessage(ev, assetUnit(tracker.asset), dict.alerts);
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
      status: ev.alert ? "CHANGED" : "OK",
      lastValue: String(current),
      // baseline нужен только для PERCENT; для порогов держим null.
      baselinePrice: tracker.assetCondition === "PERCENT" ? ev.newBaseline : null,
      lastError: null,
      lastCheckedAt: now,
      nextCheckAt,
    },
  });
}

type CertTracker = {
  id: string;
  name: string;
  url: string | null;
  threshold: number | null;
  lastValue: string | null;
  user: { telegramChatId: string | null };
};

/** Проверка одного SSL-трекера: читает серт и алертит по дням до истечения. */
async function checkCert(tracker: CertTracker, now: Date, nextCheckAt: Date, dict: Dict) {
  const host = hostnameFromUrl(tracker.url);
  if (!host || tracker.threshold == null) {
    await prisma.tracker.update({
      where: { id: tracker.id },
      data: { status: "ERROR", lastError: dict.errors.urlInvalid, lastCheckedAt: now, nextCheckAt },
    });
    return;
  }

  const res = await fetchCertInfo(host);
  if (!res.ok) {
    await prisma.tracker.update({
      where: { id: tracker.id },
      data: {
        status: "ERROR",
        lastError: checkErrorMessage(res.error, dict.errors),
        lastCheckedAt: now,
        nextCheckAt,
      },
    });
    return;
  }

  const daysLeft = res.daysLeft;
  const parsedPrev = tracker.lastValue != null ? Number(tracker.lastValue) : NaN;
  const prevDays = Number.isFinite(parsedPrev) ? parsedPrev : null;
  const ev = evalCertAlert(tracker.threshold, prevDays, daysLeft);

  await prisma.snapshot.create({ data: { trackerId: tracker.id, value: String(daysLeft) } });

  if (ev.alert) {
    const message = certAlertMessage(ev, dict.alerts);
    await prisma.alert.create({
      data: { trackerId: tracker.id, message, oldValue: tracker.lastValue, newValue: String(daysLeft) },
    });
    if (tracker.user.telegramChatId) {
      await sendTelegramMessage(
        tracker.user.telegramChatId,
        `🔔 <b>${tracker.name}</b>\n${message}\n\n${tracker.url ?? ""}`
      );
    }
  }

  await prisma.tracker.update({
    where: { id: tracker.id },
    data: {
      // expired → ошибочный (красный) статус; иначе зона алерта = CHANGED.
      status: ev.expired ? "ERROR" : ev.alert ? "CHANGED" : "OK",
      lastValue: String(daysLeft),
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

  const priceCache = new Map<string, AssetPriceResult>();

  for (const tracker of due) {
    const nextCheckAt = new Date(Date.now() + tracker.intervalMinutes * 60_000);
    // Сообщения (алерты в Telegram, ошибки) — на языке пользователя.
    const dict = getDictForLocale(tracker.user.locale);

    // Режим ASSET: цена из API + условие (порог/процент).
    if (tracker.mode === "ASSET") {
      await checkAsset(tracker, now, nextCheckAt, priceCache, dict);
      continue;
    }

    // Режим CERT: срок действия SSL-сертификата.
    if (tracker.mode === "CERT") {
      await checkCert(tracker, now, nextCheckAt, dict);
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
        data: {
          status: "ERROR",
          lastError: checkErrorMessage(result.error, dict.errors),
          lastCheckedAt: now,
          nextCheckAt,
        },
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
            tracker.mode === "PRICE" ? dict.errors.priceNotFound : dict.errors.selectorNotFound,
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
      const message = comparisonMessage(cmp, dict.alerts);
      await prisma.alert.create({
        data: { trackerId: tracker.id, message, oldValue: tracker.lastValue, newValue: stored },
      });

      if (tracker.user.telegramChatId) {
        await sendTelegramMessage(
          tracker.user.telegramChatId,
          `🔔 <b>${tracker.name}</b>\n${message}\n\n${tracker.url ?? ""}`
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
