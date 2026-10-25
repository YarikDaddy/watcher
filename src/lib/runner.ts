import { prisma } from "./prisma";
import { fetchValue, compare, comparisonMessage, toStoredValue, checkErrorMessage } from "./check";
import {
  fetchAssetPrice,
  evalAssetAlert,
  assetAlertMessage,
  assetUnit,
  assetLabel,
  type AssetPriceResult,
} from "./assets";
import { fetchCertInfo, evalCertAlert, certAlertMessage, hostnameFromUrl } from "./cert";
import { fetchDomainExpiry } from "./domain";
import { checkUptime, evalUptime, formatDuration, utcDay, RECHECK_AFTER_MS } from "./uptime";
import { sendTelegramMessage, escapeHtml } from "./telegram";
import { getDictForLocale, type Dict } from "./i18n";

/**
 * Движок проверок — общий для долгоживущего воркера (`npm run worker`) и
 * serverless-эндпоинта /api/cron/check (Vercel + внешний cron). Без состояния
 * в памяти: всё, что нужно между проходами, лежит в БД.
 */

// Аренда: пока трекер проверяется, его nextCheckAt сдвинут вперёд, чтобы
// параллельный проход (два cron-вызова внахлёст) не взял его второй раз.
const LEASE_MS = 10 * 60_000;

const trackerInclude = {
  user: { select: { telegramChatId: true, locale: true } },
  client: { select: { name: true } },
} as const;

type DueTracker = NonNullable<
  Awaited<ReturnType<typeof prisma.tracker.findFirst<{ include: typeof trackerInclude }>>>
>;

type Ctx = {
  now: Date;
  nextCheckAt: Date;
  dict: Dict;
  priceCache: Map<string, Promise<AssetPriceResult>>;
};

/** «Acme · acme.com» — в алерте сразу видно, чей это сайт. */
function title(t: DueTracker): string {
  return escapeHtml(t.client ? `${t.client.name} · ${t.name}` : t.name);
}

async function notify(t: DueTracker, text: string) {
  if (t.user.telegramChatId) await sendTelegramMessage(t.user.telegramChatId, text);
}

async function markError(t: DueTracker, ctx: Ctx, code: string) {
  await prisma.tracker.update({
    where: { id: t.id },
    data: {
      status: "ERROR",
      lastError: checkErrorMessage(code, ctx.dict.errors),
      lastCheckedAt: ctx.now,
      nextCheckAt: ctx.nextCheckAt,
    },
  });
}

// ---------- UPTIME ----------

async function runUptime(t: DueTracker, ctx: Ctx) {
  if (!t.url) return markError(t, ctx, "urlInvalid");
  const res = await checkUptime(t.url);
  const ev = evalUptime(
    { lastValue: t.lastValue, failCount: t.failCount, downSince: t.downSince },
    res,
    ctx.now
  );

  // Дневная сводка. Неподтверждённую неудачу (одиночный таймаут) не считаем;
  // при подтверждении сбоя засчитываем обе неудачные проверки.
  if (!ev.recheckSoon) {
    const confirmedNow = ev.event === "down";
    const checks = confirmedNow ? 2 : 1;
    const up = res.up ? 1 : 0;
    const totalMs = res.up ? res.ms : 0;
    const day = utcDay(ctx.now);
    await prisma.uptimeDay.upsert({
      where: { trackerId_day: { trackerId: t.id, day } },
      create: { trackerId: t.id, day, checks, up, totalMs },
      update: {
        checks: { increment: checks },
        up: { increment: up },
        totalMs: { increment: totalMs },
      },
    });
  }

  const a = ctx.dict.alerts;
  if (ev.event === "down" && !res.up) {
    const cause = checkErrorMessage(res.error, ctx.dict.errors);
    const message = a.siteDown(cause);
    await prisma.incident.create({
      data: { trackerId: t.id, cause: res.error, startedAt: ev.next.downSince ?? ctx.now },
    });
    await prisma.alert.create({ data: { trackerId: t.id, message, oldValue: "up", newValue: "down" } });
    await notify(t, `🔴 <b>${title(t)}</b>\n${escapeHtml(message)}\n\n${escapeHtml(t.url)}`);
  } else if (ev.event === "recovered") {
    const message = a.siteUp(formatDuration(ev.downtimeMs, a));
    await prisma.incident.updateMany({
      where: { trackerId: t.id, endedAt: null },
      data: { endedAt: ctx.now },
    });
    await prisma.alert.create({ data: { trackerId: t.id, message, oldValue: "down", newValue: "up" } });
    await notify(t, `🟢 <b>${title(t)}</b>\n${escapeHtml(message)}\n\n${escapeHtml(t.url)}`);
  }

  const isDown = ev.next.lastValue === "down";
  await prisma.tracker.update({
    where: { id: t.id },
    data: {
      // Подозрение (1 неудача) — статус не трогаем, пока не подтвердится.
      status: isDown ? "ERROR" : res.up ? "OK" : t.status === "PENDING" ? "PENDING" : t.status,
      lastValue: ev.next.lastValue,
      failCount: ev.next.failCount,
      downSince: ev.next.downSince,
      responseMs: res.up ? res.ms : t.responseMs,
      lastError: isDown && !res.up ? checkErrorMessage(res.error, ctx.dict.errors) : null,
      lastCheckedAt: ctx.now,
      nextCheckAt: ev.recheckSoon ? new Date(ctx.now.getTime() + RECHECK_AFTER_MS) : ctx.nextCheckAt,
    },
  });
}

// ---------- DOMAIN / CERT (срок до истечения, общая логика рубежей) ----------

async function runExpiry(t: DueTracker, ctx: Ctx, kind: "CERT" | "DOMAIN") {
  if (t.threshold == null) return markError(t, ctx, "urlInvalid");

  let daysLeft: number;
  if (kind === "CERT") {
    const host = hostnameFromUrl(t.url);
    if (!host) return markError(t, ctx, "urlInvalid");
    const res = await fetchCertInfo(host);
    if (!res.ok) return markError(t, ctx, res.error);
    daysLeft = res.daysLeft;
  } else {
    if (!t.url) return markError(t, ctx, "urlInvalid");
    const res = await fetchDomainExpiry(t.url);
    if (!res.ok) return markError(t, ctx, res.error);
    daysLeft = res.daysLeft;
  }

  const parsedPrev = t.lastValue != null ? Number(t.lastValue) : NaN;
  const ev = evalCertAlert(t.threshold, Number.isFinite(parsedPrev) ? parsedPrev : null, daysLeft);

  await prisma.snapshot.create({ data: { trackerId: t.id, value: String(daysLeft) } });

  if (ev.alert) {
    const a = ctx.dict.alerts;
    const message =
      kind === "CERT"
        ? certAlertMessage(ev, a)
        : ev.expired
          ? a.domainExpired(-ev.daysLeft)
          : a.domainExpiring(ev.daysLeft);
    await prisma.alert.create({
      data: { trackerId: t.id, message, oldValue: t.lastValue, newValue: String(daysLeft) },
    });
    await notify(t, `🔔 <b>${title(t)}</b>\n${escapeHtml(message)}\n\n${escapeHtml(t.url ?? "")}`);
  }

  await prisma.tracker.update({
    where: { id: t.id },
    data: {
      status: ev.expired ? "ERROR" : ev.alert ? "CHANGED" : "OK",
      lastValue: String(daysLeft),
      lastError: null,
      lastCheckedAt: ctx.now,
      nextCheckAt: ctx.nextCheckAt,
    },
  });
}

// ---------- ASSET ----------

async function runAsset(t: DueTracker, ctx: Ctx) {
  if (!t.asset || !t.assetCondition || t.threshold == null) {
    await prisma.tracker.update({
      where: { id: t.id },
      data: {
        status: "ERROR",
        lastError: ctx.dict.errors.assetMisconfig,
        lastCheckedAt: ctx.now,
        nextCheckAt: ctx.nextCheckAt,
      },
    });
    return;
  }

  // Один запрос на актив за проход: несколько трекеров на BTC = один вызов API.
  let pending = ctx.priceCache.get(t.asset);
  if (!pending) {
    pending = fetchAssetPrice(t.asset);
    ctx.priceCache.set(t.asset, pending);
  }
  const res = await pending;
  if (!res.ok) return markError(t, ctx, res.error);

  const current = res.price;
  const parsedPrev = t.lastValue != null ? Number(t.lastValue) : NaN;
  const ev = evalAssetAlert(
    t.assetCondition,
    t.threshold,
    { lastPrice: Number.isFinite(parsedPrev) ? parsedPrev : null, baseline: t.baselinePrice },
    current
  );

  await prisma.snapshot.create({ data: { trackerId: t.id, value: String(current) } });

  if (ev.alert) {
    const message = assetAlertMessage(ev, assetUnit(t.asset), ctx.dict.alerts);
    await prisma.alert.create({
      data: { trackerId: t.id, message, oldValue: t.lastValue, newValue: String(current) },
    });
    await notify(t, `🔔 <b>${title(t)}</b>\n${escapeHtml(assetLabel(t.asset))}: ${escapeHtml(message)}`);
  }

  await prisma.tracker.update({
    where: { id: t.id },
    data: {
      status: ev.alert ? "CHANGED" : "OK",
      lastValue: String(current),
      // baseline нужен только для PERCENT; для порогов держим null.
      baselinePrice: t.assetCondition === "PERCENT" ? ev.newBaseline : null,
      lastError: null,
      lastCheckedAt: ctx.now,
      nextCheckAt: ctx.nextCheckAt,
    },
  });
}

// ---------- PRICE / SELECTOR ----------

async function runPage(t: DueTracker, ctx: Ctx) {
  const spec =
    t.mode === "PRICE"
      ? ({ mode: "PRICE" } as const)
      : ({ mode: "SELECTOR", selector: t.selector ?? "" } as const);
  const result = await fetchValue(t.url ?? "", spec);
  if (!result.ok) return markError(t, ctx, result.error);

  // Для TEXT_CHANGE пустой результат = селектор не нашёл элемент: это ошибка
  // конфигурации, а не валидное значение. Иначе на следующем проходе «» → текст
  // дало бы ложный алерт. Для PRESENCE отсутствие элемента — валидное состояние.
  if (t.type === "TEXT_CHANGE" && !result.present) {
    await prisma.tracker.update({
      where: { id: t.id },
      data: {
        status: "ERROR",
        lastError: t.mode === "PRICE" ? ctx.dict.errors.priceNotFound : ctx.dict.errors.selectorNotFound,
        lastCheckedAt: ctx.now,
        nextCheckAt: ctx.nextCheckAt,
      },
    });
    return;
  }

  const cmp = compare(t.type, t.lastValue, result);
  const stored = toStoredValue(t.type, result);
  await prisma.snapshot.create({ data: { trackerId: t.id, value: stored } });

  if (cmp.changed) {
    const message = comparisonMessage(cmp, ctx.dict.alerts);
    await prisma.alert.create({
      data: { trackerId: t.id, message, oldValue: t.lastValue, newValue: stored },
    });
    await notify(t, `🔔 <b>${title(t)}</b>\n${escapeHtml(message)}\n\n${escapeHtml(t.url ?? "")}`);
  }

  await prisma.tracker.update({
    where: { id: t.id },
    data: {
      status: cmp.changed ? "CHANGED" : "OK",
      lastValue: stored,
      lastError: null,
      lastCheckedAt: ctx.now,
      nextCheckAt: ctx.nextCheckAt,
    },
  });
}

async function runOne(t: DueTracker, priceCache: Ctx["priceCache"]) {
  const now = new Date();
  const ctx: Ctx = {
    now,
    nextCheckAt: new Date(now.getTime() + t.intervalMinutes * 60_000),
    // Сообщения (алерты в Telegram, ошибки) — на языке пользователя.
    dict: getDictForLocale(t.user.locale),
    priceCache,
  };
  switch (t.mode) {
    case "UPTIME":
      return runUptime(t, ctx);
    case "CERT":
    case "DOMAIN":
      return runExpiry(t, ctx, t.mode);
    case "ASSET":
      return runAsset(t, ctx);
    default:
      return runPage(t, ctx);
  }
}

/** Берёт трекер в работу, если его не взял параллельный проход. */
async function claim(t: { id: string; nextCheckAt: Date }): Promise<boolean> {
  const { count } = await prisma.tracker.updateMany({
    where: { id: t.id, nextCheckAt: t.nextCheckAt },
    data: { nextCheckAt: new Date(Date.now() + LEASE_MS) },
  });
  return count === 1;
}

/** Простой пул: не больше `limit` задач одновременно. */
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export type RunStats = { checked: number; failed: number; ms: number };

/**
 * Проверяет все «созревшие» трекеры пачками, пока они есть и не вышло время.
 * deadlineMs — бюджет времени (serverless-функция ограничена по длительности).
 */
export async function runDueChecks({
  batchSize = 25,
  concurrency = 8,
  deadlineMs = 45_000,
  ids,
}: {
  batchSize?: number;
  concurrency?: number;
  deadlineMs?: number;
  ids?: string[]; // только эти трекеры (мгновенная первая проверка нового сайта)
} = {}): Promise<RunStats> {
  const started = Date.now();
  const stats: RunStats = { checked: 0, failed: 0, ms: 0 };
  const priceCache: Ctx["priceCache"] = new Map();

  while (Date.now() - started < deadlineMs) {
    const due = await prisma.tracker.findMany({
      where: { isActive: true, nextCheckAt: { lte: new Date() }, ...(ids ? { id: { in: ids } } : {}) },
      take: batchSize,
      orderBy: { nextCheckAt: "asc" },
      include: trackerInclude,
    });
    if (due.length === 0) break;

    await pool(due, concurrency, async (t) => {
      if (!(await claim(t))) return;
      try {
        await runOne(t, priceCache);
        stats.checked++;
      } catch (err) {
        // Сбой одного трекера не валит проход; аренда истечёт — проверим снова.
        stats.failed++;
        console.error(`[runner] трекер ${t.id}:`, err);
      }
    });

    if (due.length < batchSize) break;
  }

  stats.ms = Date.now() - started;
  return stats;
}
