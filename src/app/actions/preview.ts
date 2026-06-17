"use server";

import { fetchValue } from "@/lib/check";
import { fetchAssetPrice, isKnownAsset, assetUnit } from "@/lib/assets";
import { verifySession } from "@/lib/dal";

export type PreviewResult =
  | { ok: true; present: boolean; value: string }
  | { ok: false; error: string };

export type PreviewInput = {
  mode: "PRICE" | "SELECTOR" | "ASSET";
  url?: string;
  selector?: string;
  asset?: string;
};

const isHttpUrl = (u: string) => {
  try {
    const { protocol } = new URL(u);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Мгновенная проверка: показывает, что найдётся, ещё до создания трекера —
 * цену актива (ASSET), цену со страницы (PRICE) или значение селектора.
 * Только для авторизованных — ходит по произвольному внешнему ресурсу.
 */
export async function previewTracker(input: PreviewInput): Promise<PreviewResult> {
  await verifySession();

  if (input.mode === "ASSET") {
    if (!input.asset || !isKnownAsset(input.asset)) {
      return { ok: false, error: "Выберите актив." };
    }
    const res = await fetchAssetPrice(input.asset);
    if (!res.ok) return { ok: false, error: res.error };
    const unit = assetUnit(input.asset);
    return { ok: true, present: true, value: `${res.price}${unit ? ` ${unit}` : ""}` };
  }

  const url = (input.url ?? "").trim();
  if (!isHttpUrl(url)) {
    return { ok: false, error: "Введите корректный URL (с http/https)." };
  }
  if (input.mode === "SELECTOR" && !input.selector?.trim()) {
    return { ok: false, error: "Введите CSS-селектор." };
  }

  const spec =
    input.mode === "PRICE"
      ? ({ mode: "PRICE" } as const)
      : ({ mode: "SELECTOR", selector: input.selector!.trim() } as const);

  const res = await fetchValue(url, spec);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, present: res.present, value: res.value };
}
