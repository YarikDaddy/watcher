"use server";

import { fetchValue, checkErrorMessage } from "@/lib/check";
import { fetchAssetPrice, isKnownAsset, assetUnit } from "@/lib/assets";
import { fetchCertInfo, hostnameFromUrl } from "@/lib/cert";
import { verifySession } from "@/lib/dal";
import { getLocale, getDict, type Dict } from "@/lib/i18n";

export type PreviewResult =
  | { ok: true; present: boolean; value: string }
  | { ok: false; error: string };

export type PreviewInput = {
  mode: "PRICE" | "SELECTOR" | "ASSET" | "CERT";
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

/** Переводит код ошибки актива в сообщение словаря. */
function assetErrorMessage(code: string, errs: Dict["errors"]): string {
  const msg = errs[code as keyof Dict["errors"]];
  return typeof msg === "string" ? msg : errs.unknown;
}

/**
 * Мгновенная проверка: показывает, что найдётся, ещё до создания трекера —
 * цену актива (ASSET), цену со страницы (PRICE) или значение селектора.
 * Только для авторизованных — ходит по произвольному внешнему ресурсу.
 */
export async function previewTracker(input: PreviewInput): Promise<PreviewResult> {
  await verifySession();
  const dict = getDict(await getLocale());

  if (input.mode === "ASSET") {
    if (!input.asset || !isKnownAsset(input.asset)) {
      return { ok: false, error: dict.errors.pickAsset };
    }
    const res = await fetchAssetPrice(input.asset);
    if (!res.ok) return { ok: false, error: assetErrorMessage(res.error, dict.errors) };
    const unit = assetUnit(input.asset);
    return { ok: true, present: true, value: `${res.price}${unit ? ` ${unit}` : ""}` };
  }

  const url = (input.url ?? "").trim();
  if (!isHttpUrl(url)) {
    return { ok: false, error: dict.errors.urlInvalid };
  }

  if (input.mode === "CERT") {
    const host = hostnameFromUrl(url);
    if (!host) return { ok: false, error: dict.errors.urlInvalid };
    const res = await fetchCertInfo(host);
    if (!res.ok) return { ok: false, error: checkErrorMessage(res.error, dict.errors) };
    const value =
      res.daysLeft <= 0
        ? dict.form.certExpired
        : `${dict.form.certExpiresIn} ${res.daysLeft} ${dict.form.daysShort}`;
    return { ok: true, present: true, value };
  }

  if (input.mode === "SELECTOR" && !input.selector?.trim()) {
    return { ok: false, error: dict.errors.selectorRequired };
  }

  const spec =
    input.mode === "PRICE"
      ? ({ mode: "PRICE" } as const)
      : ({ mode: "SELECTOR", selector: input.selector!.trim() } as const);

  const res = await fetchValue(url, spec);
  if (!res.ok) return { ok: false, error: checkErrorMessage(res.error, dict.errors) };
  return { ok: true, present: res.present, value: res.value };
}
