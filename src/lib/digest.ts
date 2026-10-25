import { prisma } from "./prisma";
import { sendTelegramMessage, escapeHtml } from "./telegram";
import { getDictForLocale, type Dict } from "./i18n";
import { formatDuration, formatPercent, uptimePercent, utcDay } from "./uptime";

/**
 * Сводки в Telegram: /status по запросу и недельный дайджест по понедельникам.
 * Смысл — агентству не нужно открывать дашборд: картина по всем клиентам
 * приходит сама.
 */

const SOON_DAYS = 30; // SSL/домен «скоро истекает» — в сводку

type Row = {
  name: string;
  mode: string;
  status: string;
  lastValue: string | null;
  downSince: Date | null;
  client: { name: string } | null;
};

const label = (r: Row) => escapeHtml(r.client ? `${r.client.name} · ${r.name}` : r.name);

/** Разбор трекеров пользователя на «лежит» / «скоро истекает» / счётчики. */
function analyze(rows: Row[]) {
  const sites = new Set(rows.filter((r) => r.mode === "UPTIME").map((r) => r.name));
  const down = rows.filter((r) => r.mode === "UPTIME" && r.lastValue === "down");
  const expiring = rows
    .filter((r) => (r.mode === "CERT" || r.mode === "DOMAIN") && r.lastValue != null)
    .map((r) => ({ r, days: Number(r.lastValue) }))
    .filter((x) => Number.isFinite(x.days) && x.days <= SOON_DAYS)
    .sort((a, b) => a.days - b.days);
  const errors = rows.filter((r) => r.mode !== "UPTIME" && r.status === "ERROR");
  return { sites: sites.size, down, expiring, errors };
}

function expiringLines(list: { r: Row; days: number }[], b: Dict["bot"]): string[] {
  return list.map(({ r, days }) =>
    `• ${r.mode === "CERT" ? "SSL" : b.domainWord} ${label(r)} — ${days <= 0 ? b.expiredWord : b.inDays(days)}`
  );
}

/** Текст для /status: что лежит прямо сейчас и что скоро истекает. */
export async function buildStatusText(userId: string, dict: Dict): Promise<string> {
  const b = dict.bot;
  const rows = await prisma.tracker.findMany({
    where: { userId, isActive: true },
    select: { name: true, mode: true, status: true, lastValue: true, downSince: true, client: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (rows.length === 0) return b.statusEmpty;

  const { sites, down, expiring, errors } = analyze(rows);
  const now = Date.now();
  const lines = [b.statusHeader(sites, rows.length), ""];

  if (down.length === 0 && errors.length === 0) lines.push(b.allUp);
  if (down.length) {
    lines.push(b.downTitle(down.length));
    for (const r of down) {
      const since = r.downSince ? formatDuration(now - r.downSince.getTime(), dict.alerts) : "";
      lines.push(`• ${label(r)}${since ? ` — ${since}` : ""}`);
    }
  }
  if (errors.length) {
    lines.push("", b.errorsTitle(errors.length));
    for (const r of errors.slice(0, 10)) lines.push(`• ${label(r)}`);
  }
  if (expiring.length) {
    lines.push("", b.expiringTitle);
    lines.push(...expiringLines(expiring, b));
  }
  return lines.join("\n");
}

/** Текст недельного дайджеста: аптайм, инциденты, медленные сайты, сроки. */
export async function buildDigestText(userId: string, dict: Dict, now = new Date()): Promise<string | null> {
  const b = dict.bot;
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const [rows, days, incidents] = await Promise.all([
    prisma.tracker.findMany({
      where: { userId, isActive: true },
      select: { name: true, mode: true, status: true, lastValue: true, downSince: true, client: { select: { name: true } } },
    }),
    prisma.uptimeDay.findMany({
      where: { tracker: { userId }, day: { gte: utcDay(weekAgo) } },
      select: { checks: true, up: true, totalMs: true, tracker: { select: { name: true } } },
    }),
    prisma.incident.findMany({
      where: { tracker: { userId }, startedAt: { gte: weekAgo } },
      select: { startedAt: true, endedAt: true },
    }),
  ]);
  if (rows.length === 0) return null;

  const { sites, expiring } = analyze(rows);
  const downMs = incidents.reduce(
    (s, i) => s + ((i.endedAt ?? now).getTime() - i.startedAt.getTime()),
    0
  );

  // Самый медленный сайт недели по среднему времени ответа.
  const perSite = new Map<string, { ms: number; up: number }>();
  for (const d of days) {
    const cur = perSite.get(d.tracker.name) ?? { ms: 0, up: 0 };
    cur.ms += d.totalMs;
    cur.up += d.up;
    perSite.set(d.tracker.name, cur);
  }
  let slowest: { name: string; avg: number } | null = null;
  for (const [name, v] of perSite) {
    if (!v.up) continue;
    const avg = v.ms / v.up;
    if (!slowest || avg > slowest.avg) slowest = { name, avg };
  }

  const lines = [b.digestTitle, "", b.digestSites(sites, formatPercent(uptimePercent(days)))];
  lines.push(
    incidents.length
      ? b.digestIncidents(incidents.length, formatDuration(downMs, dict.alerts))
      : b.digestNoIncidents
  );
  if (slowest && slowest.avg > 1000) {
    lines.push(b.digestSlowest(escapeHtml(slowest.name), (slowest.avg / 1000).toFixed(1)));
  }
  if (expiring.length) lines.push("", b.expiringTitle, ...expiringLines(expiring, b));
  lines.push("", b.digestFooter);
  return lines.join("\n");
}

/**
 * Рассылает недельный дайджест: по понедельникам с 06:00 UTC, не чаще раза в
 * 6 дней на пользователя. Вызывается из каждого прохода движка — дёшево:
 * в остальное время один быстрый запрос не делается вовсе.
 */
export async function sendDueDigests(now = new Date()): Promise<number> {
  if (now.getUTCDay() !== 1 || now.getUTCHours() < 6) return 0;
  const cutoff = new Date(now.getTime() - 6 * 86_400_000);
  const users = await prisma.user.findMany({
    where: {
      telegramChatId: { not: null },
      OR: [{ lastDigestAt: null }, { lastDigestAt: { lt: cutoff } }],
    },
    select: { id: true, telegramChatId: true, locale: true },
    take: 50,
  });

  let sent = 0;
  for (const u of users) {
    // Сначала отмечаем — даже если отправка упадёт, не спамим повтором.
    await prisma.user.update({ where: { id: u.id }, data: { lastDigestAt: now } });
    const text = await buildDigestText(u.id, getDictForLocale(u.locale), now);
    if (text && u.telegramChatId && (await sendTelegramMessage(u.telegramChatId, text))) sent++;
  }
  return sent;
}
