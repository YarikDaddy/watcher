"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { getLocale, getDict } from "@/lib/i18n";
import { normalizeSiteUrl, siteHost, isSiteMode, SITE_MODES } from "@/lib/sites";
import { registrableDomain, isPlatformHost } from "@/lib/domain";
import { runDueChecks } from "@/lib/runner";
import { FREE_SITE_LIMIT, FREE_TIER_TRACKER_LIMIT } from "@/lib/validation";

export type SiteFormState = { error?: string; success?: boolean; host?: string } | undefined;

/**
 * «Добавить сайт» в одно поле: создаёт сразу аптайм (каждые 5 мин), срок SSL
 * (за 14 дней) и срок домена (за 30 дней) и тут же проверяет — статус
 * появляется на дашборде через пару секунд, а не через минуту.
 */
export async function addSite(_state: SiteFormState, formData: FormData): Promise<SiteFormState> {
  const { userId } = await verifySession();
  const dict = getDict(await getLocale());
  const s = dict.sites;

  const url = normalizeSiteUrl(String(formData.get("url") ?? ""));
  const host = siteHost(url);
  if (!url || !host) return { error: s.urlInvalid };

  // Клиент по имени: существующий (без учёта регистра) или новый — агентству
  // не нужно заранее заводить клиента в настройках. Пусто → без клиента.
  const clientName = String(formData.get("client") ?? "").trim().slice(0, 100);
  let clientId: string | null = null;
  if (clientName) {
    const found = await prisma.client.findFirst({
      where: { userId, name: { equals: clientName, mode: "insensitive" } },
      select: { id: true },
    });
    clientId = found?.id ?? null;
  }

  const existing = await prisma.tracker.findMany({
    where: { userId, mode: { in: [...SITE_MODES] } },
    select: { url: true, clientId: true },
  });
  const hosts = new Set(existing.map((t) => `${t.clientId ?? "-"}|${siteHost(t.url)}`));
  // Для нового (ещё не созданного) клиента дубликата быть не может.
  const newClient = !!clientName && !clientId;
  if (!newClient && hosts.has(`${clientId ?? "-"}|${host}`)) return { error: s.duplicate };
  const siteCount = new Set(existing.map((t) => siteHost(t.url))).size;
  if (siteCount >= FREE_SITE_LIMIT) return { error: dict.errors.siteLimit(FREE_SITE_LIMIT) };
  const total = await prisma.tracker.count({ where: { userId } });
  if (total + 3 > FREE_TIER_TRACKER_LIMIT) return { error: dict.errors.limitReached(FREE_TIER_TRACKER_LIMIT) };

  const base = { userId, clientId, name: host, url, type: "TEXT_CHANGE" as const };
  const rows: (typeof base & { mode: "UPTIME" | "CERT" | "DOMAIN"; intervalMinutes: number; threshold?: number })[] = [
    { ...base, mode: "UPTIME", intervalMinutes: 5 },
  ];
  // SSL — только для https; домен — если он «свой» (не поддомен хостинга).
  if (url.startsWith("https:")) rows.push({ ...base, mode: "CERT", threshold: 14, intervalMinutes: 720 });
  const domain = registrableDomain(host);
  if (domain && !isPlatformHost(domain)) {
    rows.push({ ...base, mode: "DOMAIN", threshold: 30, intervalMinutes: 1440 });
  }

  let ids: string[];
  try {
    if (newClient) {
      const created = await prisma.client.create({ data: { userId, name: clientName }, select: { id: true } });
      clientId = created.id;
      for (const r of rows) r.clientId = clientId;
    }
    const created = await prisma.$transaction(rows.map((data) => prisma.tracker.create({ data, select: { id: true } })));
    ids = created.map((c) => c.id);
  } catch (err) {
    console.error("[addSite]", err);
    return { error: dict.errors.createFailed };
  }

  // Мгновенная первая проверка (с бюджетом времени — форма не должна висеть).
  try {
    await runDueChecks({ ids, deadlineMs: 15_000 });
  } catch (err) {
    console.error("[addSite] первая проверка:", err);
  }

  revalidatePath("/dashboard");
  return { success: true, host };
}

/** id трекеров сайта из формы — только свои и только «сайтовых» режимов. */
async function ownSiteTrackers(formData: FormData, userId: string) {
  const ids = String(formData.get("ids") ?? "").split(",").filter(Boolean).slice(0, 10);
  if (!ids.length) return [];
  const rows = await prisma.tracker.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true, mode: true, isActive: true },
  });
  return rows.filter((r) => isSiteMode(r.mode));
}

/** Удаляет сайт целиком (все его проверки). */
export async function deleteSite(formData: FormData): Promise<void> {
  const { userId } = await verifySession();
  const rows = await ownSiteTrackers(formData, userId);
  if (!rows.length) return;
  await prisma.tracker.deleteMany({ where: { id: { in: rows.map((r) => r.id) }, userId } });
  revalidatePath("/dashboard");
}

/** Пауза/возобновление всех проверок сайта разом. */
export async function toggleSite(formData: FormData): Promise<void> {
  const { userId } = await verifySession();
  const rows = await ownSiteTrackers(formData, userId);
  if (!rows.length) return;
  const anyActive = rows.some((r) => r.isActive);
  const ids = rows.map((r) => r.id);
  // На паузе сбой не отслеживаем — закрываем открытый инцидент, чтобы он не
  // «длился» на статус-странице всю паузу.
  if (anyActive) {
    await prisma.incident.updateMany({ where: { trackerId: { in: ids }, endedAt: null }, data: { endedAt: new Date() } });
  }
  await prisma.tracker.updateMany({
    where: { id: { in: rows.map((r) => r.id) }, userId },
    data: anyActive
      ? { isActive: false }
      : // При возобновлении — свежий старт без ложных алертов по старому состоянию.
        { isActive: true, status: "PENDING", nextCheckAt: new Date(), lastValue: null, failCount: 0, downSince: null },
  });
  revalidatePath("/dashboard");
}

/** Перенос сайта к другому клиенту. */
export async function moveSite(formData: FormData): Promise<void> {
  const { userId } = await verifySession();
  const rows = await ownSiteTrackers(formData, userId);
  if (!rows.length) return;
  const raw = String(formData.get("clientId") ?? "");
  const client = raw
    ? await prisma.client.findFirst({ where: { id: raw, userId }, select: { id: true } })
    : null;
  await prisma.tracker.updateMany({
    where: { id: { in: rows.map((r) => r.id) }, userId },
    data: { clientId: client?.id ?? null },
  });
  revalidatePath("/dashboard");
}
