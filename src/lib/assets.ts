// Финансовые активы для режима ASSET: каталог, загрузка цены из бесплатных
// API (без ключей) и чистая логика вычисления алерта.

export type AssetCondition = "ABOVE" | "BELOW" | "PERCENT";

export type Asset = {
  value: string; // "crypto:bitcoin" | "metal:XAU" | "fiat:RUB"
  label: string;
  unit: string; // символ валюты цены, "" для курсов
};

export const ASSETS: Asset[] = [
  { value: "crypto:BTC", label: "Bitcoin (BTC)", unit: "$" },
  { value: "crypto:ETH", label: "Ethereum (ETH)", unit: "$" },
  { value: "crypto:SOL", label: "Solana (SOL)", unit: "$" },
  { value: "crypto:DOGE", label: "Dogecoin (DOGE)", unit: "$" },
  { value: "metal:XAU", label: "Gold (XAU)", unit: "$" },
  { value: "metal:XAG", label: "Silver (XAG)", unit: "$" },
  { value: "fiat:EUR", label: "USD → EUR", unit: "" },
  { value: "fiat:RUB", label: "USD → RUB", unit: "" },
];

const ASSET_VALUES = new Set(ASSETS.map((a) => a.value));
export const isKnownAsset = (value: string) => ASSET_VALUES.has(value);
export const assetLabel = (value: string) =>
  ASSETS.find((a) => a.value === value)?.label ?? value;
export const assetUnit = (value: string) =>
  ASSETS.find((a) => a.value === value)?.unit ?? "";

export type AssetPriceResult =
  | { ok: true; price: number }
  | { ok: false; error: string };

async function fetchJson(url: string, timeoutMs = 12000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const KRAKEN_PAIR: Record<string, string> = {
  BTC: "XBTUSD",
  ETH: "ETHUSD",
  SOL: "SOLUSD",
  DOGE: "XDGUSD",
};

/** Цена крипты: Coinbase, при сбое — Kraken. Оба бесплатны и без ключа. */
async function fetchCryptoPrice(symbol: string): Promise<AssetPriceResult> {
  // 1) Coinbase spot
  try {
    const data = (await fetchJson(
      `https://api.coinbase.com/v2/prices/${symbol}-USD/spot`
    )) as { data?: { amount?: string } };
    const price = Number(data.data?.amount);
    if (Number.isFinite(price)) return { ok: true, price };
  } catch {
    // переходим к резервному источнику
  }
  // 2) Kraken (резерв, если Coinbase недоступен/лимит)
  const pair = KRAKEN_PAIR[symbol];
  if (pair) {
    try {
      const data = (await fetchJson(
        `https://api.kraken.com/0/public/Ticker?pair=${pair}`
      )) as { result?: Record<string, { c?: string[] }> };
      const first = data.result ? Object.values(data.result)[0] : undefined;
      const price = Number(first?.c?.[0]);
      if (Number.isFinite(price)) return { ok: true, price };
    } catch {
      // ниже вернём общую ошибку
    }
  }
  return { ok: false, error: "priceSourceDown" };
}

/** Текущая цена актива из соответствующего провайдера. Ошибка — код словаря. */
export async function fetchAssetPrice(asset: string): Promise<AssetPriceResult> {
  const [provider, symbol] = asset.split(":");
  try {
    if (provider === "crypto") {
      return await fetchCryptoPrice(symbol);
    }
    if (provider === "metal") {
      const data = (await fetchJson(
        `https://api.gold-api.com/price/${symbol}`
      )) as { price?: number };
      if (typeof data.price !== "number") return { ok: false, error: "assetNotFound" };
      return { ok: true, price: data.price };
    }
    if (provider === "fiat") {
      const data = (await fetchJson("https://open.er-api.com/v6/latest/USD")) as {
        rates?: Record<string, number>;
      };
      const price = data.rates?.[symbol];
      if (typeof price !== "number") return { ok: false, error: "assetNotFound" };
      return { ok: true, price };
    }
    return { ok: false, error: "assetNotFound" };
  } catch {
    return { ok: false, error: "priceSourceDown" };
  }
}

// Результат как тип события; текст алерта строится на краю (воркер) по локали
// пользователя. Числа возвращаем сырыми — форматирование/единицы на краю.
export type AssetAlert =
  | { alert: false; newBaseline: number | null }
  | { alert: true; kind: "above" | "below"; threshold: number; current: number; newBaseline: number | null }
  | { alert: true; kind: "up" | "down"; pct: number; from: number; to: number; newBaseline: number | null };

function conditionMet(condition: AssetCondition, price: number, threshold: number): boolean {
  return condition === "ABOVE" ? price >= threshold : price <= threshold;
}

/**
 * Чистая логика алерта по активу.
 * ABOVE/BELOW — фронт-триггер: алерт только в момент пересечения порога.
 * PERCENT — алерт при изменении на ±threshold% от baseline, затем baseline
 * сбрасывается на текущую цену.
 */
export function evalAssetAlert(
  condition: AssetCondition,
  threshold: number,
  prev: { lastPrice: number | null; baseline: number | null },
  current: number
): AssetAlert {
  if (condition === "PERCENT") {
    const baseline = prev.baseline ?? current;
    const pct = baseline === 0 ? 0 : ((current - baseline) / baseline) * 100;
    if (Math.abs(pct) >= threshold) {
      return {
        alert: true,
        kind: pct > 0 ? "up" : "down",
        pct: Math.abs(pct),
        from: baseline,
        to: current,
        newBaseline: current,
      };
    }
    return { alert: false, newBaseline: baseline };
  }

  const prevMet =
    prev.lastPrice == null ? false : conditionMet(condition, prev.lastPrice, threshold);
  const curMet = conditionMet(condition, current, threshold);
  if (!prevMet && curMet) {
    return {
      alert: true,
      kind: condition === "ABOVE" ? "above" : "below",
      threshold,
      current,
      newBaseline: null,
    };
  }
  return { alert: false, newBaseline: null };
}

const fmtNumber = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** Текст алерта по активу для Telegram (по локали пользователя). */
export function assetAlertMessage(
  res: Extract<AssetAlert, { alert: true }>,
  unit: string,
  a: { crossedAbove: (t: string, c: string) => string; crossedBelow: (t: string, c: string) => string; movedUp: (p: string, f: string, t: string) => string; movedDown: (p: string, f: string, t: string) => string }
): string {
  const u = unit ? ` ${unit}` : "";
  const f = (n: number) => `${fmtNumber(n)}${u}`;
  switch (res.kind) {
    case "above":
      return a.crossedAbove(f(res.threshold), f(res.current));
    case "below":
      return a.crossedBelow(f(res.threshold), f(res.current));
    case "up":
      return a.movedUp(res.pct.toFixed(2), f(res.from), f(res.to));
    case "down":
      return a.movedDown(res.pct.toFixed(2), f(res.from), f(res.to));
  }
}
