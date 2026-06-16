"use server";

import * as z from "zod";
import { fetchValue } from "@/lib/check";
import { verifySession } from "@/lib/dal";

export type PreviewResult =
  | { ok: true; present: boolean; value: string }
  | { ok: false; error: string };

const PreviewInput = z.object({
  url: z.url({ error: "Введите корректный URL (с http/https)." }).trim(),
  selector: z.string().trim().min(1, { error: "Введите CSS-селектор." }).max(200),
});

/**
 * Мгновенная проверка: загружает страницу и извлекает значение по селектору,
 * чтобы пользователь сразу увидел результат ещё до создания трекера.
 * Только для авторизованных — fetchValue ходит по произвольному внешнему URL.
 */
export async function previewSelector(
  url: string,
  selector: string
): Promise<PreviewResult> {
  await verifySession();

  const parsed = PreviewInput.safeParse({ url, selector });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные.",
    };
  }

  const res = await fetchValue(parsed.data.url, parsed.data.selector);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, present: res.present, value: res.value };
}
