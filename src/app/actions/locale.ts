"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

/**
 * Сохраняет выбранный язык в cookie на год и в БД (для алертов в Telegram).
 * Cookie, выставленная в Server Action, сама возвращает обновлённую страницу
 * в том же ответе — отдельный router.refresh() не нужен (был вторым запросом).
 * Запись в БД — после ответа (after), чтобы не ждать Neon.
 */
export async function setLocale(locale: Locale): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const userId = await getSessionUserId();
  if (userId) {
    after(() => prisma.user.update({ where: { id: userId }, data: { locale } }).catch(() => {}));
  }
}
