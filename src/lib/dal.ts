import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSessionUserId } from "./session";

/**
 * Проверяет сессию. Если её нет — редирект на /login.
 * cache() мемоизирует результат в пределах одного рендера.
 */
export const verifySession = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return { userId };
});

/** Текущий пользователь (только безопасные поля). */
export const getUser = cache(async () => {
  const { userId } = await verifySession();
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, telegramChatId: true, brandName: true, locale: true, createdAt: true },
  });
});

/** Трекеры текущего пользователя. */
export const getTrackers = cache(async () => {
  const { userId } = await verifySession();
  return prisma.tracker.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
});

/** Клиенты текущего пользователя (для группировки трекеров). */
export const getClients = cache(async () => {
  const { userId } = await verifySession();
  return prisma.client.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, shareToken: true },
  });
});

/**
 * Публичная статус-страница по share-токену — БЕЗ сессии (доступна клиенту
 * агентства по ссылке). Возвращает клиента, его трекеры и бренд владельца.
 */
export const getClientByShareToken = cache(async (token: string) => {
  if (!token) return null;
  const since = new Date(Date.now() - 90 * 86_400_000);
  return prisma.client.findUnique({
    where: { shareToken: token },
    select: {
      name: true,
      user: { select: { brandName: true } },
      trackers: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          url: true,
          clientId: true,
          mode: true,
          status: true,
          lastValue: true,
          isActive: true,
          lastCheckedAt: true,
          responseMs: true,
          downSince: true,
          uptimeDays: {
            where: { day: { gte: since } },
            select: { day: true, checks: true, up: true, totalMs: true },
          },
          incidents: {
            where: { startedAt: { gte: since } },
            orderBy: { startedAt: "desc" },
            take: 20,
            select: { id: true, cause: true, startedAt: true, endedAt: true },
          },
        },
      },
    },
  });
});

/**
 * История аптайма для дашборда: дневные сводки за 30 дней и инциденты за
 * 7 дней по всем трекерам пользователя.
 */
export const getUptimeHistory = cache(async () => {
  const { userId } = await verifySession();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [days, incidents] = await Promise.all([
    prisma.uptimeDay.findMany({
      where: { tracker: { userId }, day: { gte: since } },
      select: { trackerId: true, day: true, checks: true, up: true, totalMs: true },
    }),
    prisma.incident.findMany({
      where: { tracker: { userId }, startedAt: { gte: weekAgo } },
      select: { trackerId: true, startedAt: true, endedAt: true },
    }),
  ]);
  return { days, incidents };
});

/** Последние срабатывания (алерты) по всем трекерам пользователя. */
export const getRecentAlerts = cache(async () => {
  const { userId } = await verifySession();
  return prisma.alert.findMany({
    where: { tracker: { userId } },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      message: true,
      createdAt: true,
      tracker: { select: { name: true } },
    },
  });
});
