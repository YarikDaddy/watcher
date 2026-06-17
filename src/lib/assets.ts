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
  return { ok: false, error: "Источник цен недоступен" };
}

/** Текущая цена актива из соответствующего провайдера. */
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
      if (typeof data.price !== "number") return { ok: false, error: "Цена недоступна" };
      return { ok: true, price: data.price };
    }
    if (provider === "fiat") {
      const data = (await fetchJson("https://open.er-api.com/v6/latest/USD")) as {
        rates?: Record<string, number>;
      };
      const price = data.rates?.[symbol];
      if (typeof price !== "number") return { ok: false, error: "Курс недоступен" };
      return { ok: true, price };
    }
    return { ok: false, error: "Неизвестный актив" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Ошибка";
    return { ok: false, error: `Источник недоступен (${msg})` };
  }
}

export type AssetAlert = {
  alert: boolean;
  message: string;
  newBaseline: number | null;
};

function conditionMet(condition: AssetCondition, price: number, threshold: number): boolean {
  return condition === "ABOVE" ? price >= threshold : price <= threshold;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

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
  current: number,
  unit = ""
): AssetAlert {
  const u = unit ? ` ${unit}` : "";

  if (condition === "PERCENT") {
    const baseline = prev.baseline ?? current;
    const pct = baseline === 0 ? 0 : ((current - baseline) / baseline) * 100;
    if (Math.abs(pct) >= threshold) {
      const dir = pct > 0 ? "вырос" : "упал";
      return {
        alert: true,
        message: `${dir} на ${Math.abs(pct).toFixed(2)}% (${fmt(baseline)}${u} → ${fmt(current)}${u})`,
        newBaseline: current,
      };
    }
    return { alert: false, message: "", newBaseline: baseline };
  }

  const prevMet =
    prev.lastPrice == null ? false : conditionMet(condition, prev.lastPrice, threshold);
  const curMet = conditionMet(condition, current, threshold);
  if (!prevMet && curMet) {
    const word = condition === "ABOVE" ? "поднялась выше" : "опустилась ниже";
    return {
      alert: true,
      message: `Цена ${word} ${fmt(threshold)}${u} — сейчас ${fmt(current)}${u}`,
      newBaseline: null,
    };
  }
  return { alert: false, message: "", newBaseline: null };
}
