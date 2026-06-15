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
