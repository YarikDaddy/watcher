"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export type TelegramLinkState = { deepLink: string } | { message: string };

/**
 * Генерирует одноразовый токен привязки и возвращает deep-link на бота.
 * Старый токен (если был) перезаписывается — действует только последняя ссылка.
 */
export async function generateTelegramLink(): Promise<TelegramLinkState> {
  const { userId } = await verifySession();

  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username) {
    return { message: "Бот не настроен. Обратитесь к администратору." };
  }

  const token = randomBytes(16).toString("hex");
  await prisma.user.update({
    where: { id: userId },
    data: { telegramLinkToken: token },
  });

  return { deepLink: `https://t.me/${username}?start=${token}` };
}

/** Отвязывает Telegram от текущего аккаунта. */
export async function unlinkTelegram(): Promise<void> {
  const { userId } = await verifySession();
  await prisma.user.update({
    where: { id: userId },
    data: { telegramChatId: null, telegramLinkToken: null },
  });
  revalidatePath("/dashboard");
}
