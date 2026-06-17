import * as cheerio from "cheerio";
import type { Dict } from "./i18n";

type Loaded = ReturnType<typeof cheerio.load>;
type Errors = Dict["errors"];

/**
 * Что именно извлекать со страницы:
 * - PRICE: цену определяем автоматически (селектор не нужен);
 * - SELECTOR: значение по пользовательскому CSS-селектору.
 */
export type ExtractSpec =
  | { mode: "PRICE" }
  | { mode: "SELECTOR"; selector: string };

// Ошибка как стабильный код; перевод — на краю (preview по локали запроса,
// воркер по локали пользователя). "http:NNN" несёт HTTP-статус.
export type CheckResult =
  | { ok: true; value: string; present: boolean }
  | { ok: false; error: string };

function httpErrorCode(status: number): string {
  if (status === 401 || status === 403) return "blocked";
  if (status === 404) return "notFound";
  if (status === 429) return "rateLimit";
  if (status >= 500) return "serverDown";
  return `http:${status}`;
}

function networkErrorCode(err: unknown): string {
  if (!(err instanceof Error)) return "unknown";
  if (err.name === "AbortError") return "timeout";
  if (/ENOTFOUND|EAI_AGAIN/.test(err.message)) return "dns";
  if (/certificate|SSL|TLS/i.test(err.message)) return "cert";
  return "openFailed";
}

/** Переводит код ошибки проверки в человеческое сообщение по словарю. */
export function checkErrorMessage(code: string, errs: Errors): string {
  if (code.startsWith("http:")) {
    return errs.loadFailed(Number(code.slice(5)) || 0);
  }
  const key = code as keyof Errors;
  const msg = errs[key];
  return typeof msg === "string" ? msg : errs.unknown;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  RUB: "₽",
  RUR: "₽",
  USD: "$",
  EUR: "€",
  GBP: "£",
  UAH: "₴",
};

// Денежная сумма с символом/кодом валюты до или после числа.
const PRICE_RE =
  /(?:[$€£₽₴]|USD|EUR|RUB|RUR|UAH|руб\.?|грн)\s?\d[\d., ]*\d|\d[\d., ]*\d\s?(?:[$€£₽₴]|USD|EUR|RUB|RUR|UAH|руб\.?|грн)/i;

function formatPrice(amount: string | number, currency?: string): string {
  const cur = currency
    ? CURRENCY_SYMBOL[currency.toUpperCase()] ?? currency
    : "";
  return `${amount} ${cur}`.replace(/\s+/g, " ").trim();
}

/** Ищет первую денежную сумму в произвольном тексте. */
function matchPrice(text: string): string | null {
  const m = text.replace(/\s+/g, " ").match(PRICE_RE);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

/** Рекурсивно ищет цену в распарсенном JSON-LD (Schema.org Product/Offer). */
function findPriceInJsonLd(node: unknown): string | null {
  if (node == null) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const r = findPriceInJsonLd(item);
      if (r) return r;
    }
    return null;
  }
  if (typeof node !== "object") return null;

  const obj = node as Record<string, unknown>;
  for (const key of ["price", "lowPrice"]) {
    const v = obj[key];
    if ((typeof v === "string" || typeof v === "number") && /\d/.test(String(v))) {
      const cur = obj["priceCurrency"];
      return formatPrice(v, typeof cur === "string" ? cur : undefined);
    }
  }
  if (obj.offers) {
    const r = findPriceInJsonLd(obj.offers);
    if (r) return r;
  }
  for (const k of Object.keys(obj)) {
    if (k === "offers") continue;
    const r = findPriceInJsonLd(obj[k]);
    if (r) return r;
  }
  return null;
}

/**
 * Автоопределение цены без селектора. Слои по убыванию надёжности:
 * 1) JSON-LD (Schema.org); 2) meta-теги (OpenGraph/microdata);
 * 3) типовые элементы с ценой; 4) регэксп по тексту страницы.
 */
export function extractPrice($: Loaded): string | null {
  let fromJsonLd: string | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (fromJsonLd) return;
    try {
      fromJsonLd = findPriceInJsonLd(JSON.parse($(el).text()));
    } catch {
      // битый JSON-LD игнорируем
    }
  });
  if (fromJsonLd) return fromJsonLd;

  const metaPairs: [string, string][] = [
    ['meta[property="product:price:amount"]', 'meta[property="product:price:currency"]'],
    ['meta[property="og:price:amount"]', 'meta[property="og:price:currency"]'],
    ['meta[itemprop="price"]', 'meta[itemprop="priceCurrency"]'],
  ];
  for (const [amountSel, currencySel] of metaPairs) {
    const amount = $(amountSel).attr("content");
    if (amount && /\d/.test(amount)) {
      return formatPrice(amount.trim(), $(currencySel).attr("content"));
    }
  }

  const elementSelectors = [
    '[itemprop="price"]',
    "[data-price]",
    '[class*="price" i]',
    '[id*="price" i]',
  ];
  for (const sel of elementSelectors) {
    let found: string | null = null;
    $(sel).each((_, el) => {
      if (found) return;
      const $el = $(el);
      found = matchPrice($el.attr("content") ?? $el.text());
    });
    if (found) return found;
  }

  return matchPrice($("body").text());
}

function extract($: Loaded, spec: ExtractSpec): { value: string; present: boolean } {
  if (spec.mode === "PRICE") {
    const price = extractPrice($);
    return { value: price ?? "", present: price !== null };
  }
  const el = $(spec.selector).first();
  const present = el.length > 0;
  const value = present ? el.text().replace(/\s+/g, " ").trim() : "";
  return { value, present };
}

/**
 * Загружает страницу и извлекает значение согласно spec.
 * MVP: только статичный HTML (без JS-рендеринга).
 */
export async function fetchValue(
  url: string,
  spec: ExtractSpec,
  timeoutMs = 15000
): Promise<CheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Браузерный User-Agent: на «ботовский» UA многие сайты отвечают 403.
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      },
    });

    if (!res.ok) {
      return { ok: false, error: httpErrorCode(res.status) };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const { value, present } = extract($, spec);

    return { ok: true, value, present };
  } catch (err) {
    return { ok: false, error: networkErrorCode(err) };
  } finally {
    clearTimeout(timer);
  }
}

// Результат сравнения как тип события; текст алерта строится на краю (воркер)
// по локали пользователя — функция остаётся чистой и тестируемой.
export type Comparison =
  | { changed: false }
  | { changed: true; kind: "text"; prev: string; cur: string }
  | { changed: true; kind: "appeared" }
  | { changed: true; kind: "disappeared" };

/**
 * Сравнивает новое значение с предыдущим в зависимости от типа трекера.
 * type: "TEXT_CHANGE" — изменился ли текст; "PRESENCE" — изменилось ли наличие.
 */
export function compare(
  type: "TEXT_CHANGE" | "PRESENCE",
  previous: string | null,
  current: { value: string; present: boolean }
): Comparison {
  if (type === "PRESENCE") {
    if (previous === null) return { changed: false };
    const prevPresent = previous === "present";
    if (prevPresent !== current.present) {
      return { changed: true, kind: current.present ? "appeared" : "disappeared" };
    }
    return { changed: false };
  }

  // TEXT_CHANGE
  if (previous === null) return { changed: false };
  if (previous !== current.value) {
    return { changed: true, kind: "text", prev: previous, cur: current.value };
  }
  return { changed: false };
}

/** Текст алерта для Telegram по результату compare и словарю алертов. */
export function comparisonMessage(cmp: Comparison, a: Dict["alerts"]): string {
  if (!cmp.changed) return "";
  if (cmp.kind === "text") return a.textChanged(cmp.prev, cmp.cur);
  return cmp.kind === "appeared" ? a.appeared : a.disappeared;
}

/** Нормализованное значение для хранения как "последнее". */
export function toStoredValue(
  type: "TEXT_CHANGE" | "PRESENCE",
  result: { value: string; present: boolean }
): string {
  return type === "PRESENCE" ? (result.present ? "present" : "absent") : result.value;
}
