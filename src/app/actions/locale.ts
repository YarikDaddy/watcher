"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

/** Сохраняет выбранный язык в cookie на год и в БД (для алертов воркера). */
export async function setLocale(locale: Locale): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const userId = await getSessionUserId();
  if (userId) {
    await prisma.user.update({ where: { id: userId }, data: { locale } }).catch(() => {});
  }
}
