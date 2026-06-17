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
    select: { id: true, email: true, telegramChatId: true, createdAt: true },
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
    select: { id: true, name: true },
  });
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
