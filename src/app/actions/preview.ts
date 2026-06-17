"use server";

import * as z from "zod";
import { fetchValue } from "@/lib/check";
import { verifySession } from "@/lib/dal";

export type PreviewResult =
  | { ok: true; present: boolean; value: string }
  | { ok: false; error: string };

const PreviewInput = z
  .object({
    url: z.url({ error: "Введите корректный URL (с http/https)." }).trim(),
    mode: z.enum(["PRICE", "SELECTOR"]),
    selector: z.string().trim().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "SELECTOR" && !data.selector) {
      ctx.addIssue({ code: "custom", path: ["selector"], message: "Введите CSS-селектор." });
    }
  });

/**
 * Мгновенная проверка: загружает страницу и сразу показывает, что найдётся
 * (цена в режиме PRICE или значение селектора), ещё до создания трекера.
 * Только для авторизованных — fetchValue ходит по произвольному внешнему URL.
 */
export async function previewTracker(
  url: string,
  mode: "PRICE" | "SELECTOR",
  selector?: string
): Promise<PreviewResult> {
  await verifySession();

  const parsed = PreviewInput.safeParse({ url, mode, selector });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные.",
    };
  }

  const spec =
    parsed.data.mode === "PRICE"
      ? ({ mode: "PRICE" } as const)
      : ({ mode: "SELECTOR", selector: parsed.data.selector! } as const);

  const res = await fetchValue(parsed.data.url, spec);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, present: res.present, value: res.value };
}
