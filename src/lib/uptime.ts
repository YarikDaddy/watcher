import type { Dict } from "./i18n";

// Результат одной проверки доступности. Ошибка — стабильный код (как в
// check.ts), перевод на краю через checkErrorMessage.
export type UptimeResult =
  | { up: true; status: number; ms: number }
  | { up: false; error: string; ms: number };

// Браузерный UA: на «ботовский» многие сайты (и Cloudflare) отвечают 403.
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/**
 * Считается ли HTTP-ответ «сайт работает».
 * 2xx/3xx — да. 5xx, 404 и 410 — нет (сервер лежит / страницы нет).
 * 401/403/429 и прочие 4xx — да: сервер жив и отвечает, просто не пускает
 * робота (частый случай с Cloudflare) — иначе были бы ложные «сайт упал».
 */
export function isUpStatus(status: number): boolean {
  if (status >= 500) return false;
  if (status === 404 || status === 410) return false;
  return true;
}

function networkErrorCode(err: unknown): string {
  if (!(err instanceof Error)) return "unknown";
  if (err.name === "AbortError" || err.name === "TimeoutError") return "timeout";
  // fetch (undici) прячет настоящую причину в err.cause.
  const cause = (err as { cause?: { code?: string; message?: string } }).cause;
  const text = `${err.message} ${cause?.code ?? ""} ${cause?.message ?? ""}`;
  if (/ENOTFOUND|EAI_AGAIN/.test(text)) return "dns";
  if (/CONNECT_TIMEOUT|ETIMEDOUT/.test(text)) return "timeout";
  if (/certificate|SSL|TLS|CERT_/i.test(text)) return "cert";
  if (/ECONNREFUSED/.test(text)) return "refused";
  return "openFailed";
}

/**
 * Один HTTP-запрос к сайту: жив ли и как быстро ответил.
 * guard — для публичных проверок гостей: каждый URL (включая шаги редиректа)
 * сначала проходит проверку, иначе редирект на 127.0.0.1 обошёл бы защиту.
 */
export async function checkUptime(
  url: string,
  timeoutMs = 15000,
  guard?: (url: string) => Promise<boolean>
): Promise<UptimeResult> {
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    let current = url;
    let res: Response;
    for (let hop = 0; ; hop++) {
      if (guard && !(await guard(current))) return { up: false, error: "blocked", ms: elapsed() };
      res = await fetch(current, {
        signal,
        redirect: guard ? "manual" : "follow",
        cache: "no-store",
        headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" },
      });
      const location = res.headers.get("location");
      if (!guard || res.status < 300 || res.status >= 400 || !location || hop >= 5) break;
      await res.body?.cancel().catch(() => {});
      current = new URL(location, current).toString();
    }
    // Тело не нужно — освобождаем соединение, время считаем до заголовков.
    const ms = elapsed();
    await res.body?.cancel().catch(() => {});
    if (!isUpStatus(res.status)) {
      return { up: false, error: res.status >= 500 ? `http:${res.status}` : "notFound", ms };
    }
    return { up: true, status: res.status, ms };
  } catch (err) {
    return { up: false, error: networkErrorCode(err), ms: elapsed() };
  }
}

// Сколько неудачных проверок подряд нужно, чтобы объявить сбой. Одиночный
// таймаут бывает у любого сайта — алерт только после подтверждения.
export const CONFIRM_FAILURES = 2;
// После первой неудачи перепроверяем быстро, не дожидаясь полного интервала.
export const RECHECK_AFTER_MS = 60_000;

export type UptimeState = {
  lastValue: string | null; // "up" | "down" | null (ещё не проверяли)
  failCount: number;
  downSince: Date | null;
};

export type UptimeEval = {
  next: UptimeState;
  event: "down" | "recovered" | null;
  downtimeMs: number; // для recovered — длительность сбоя
  recheckSoon: boolean; // первая неудача — перепроверить через минуту
};

/**
 * Чистая машина состояний аптайма (тестируемая, без БД и сети).
 * up → (неудача) → подозрение (failCount=1, перепроверка) → (ещё неудача) → down + алерт
 * down → (успех) → up + алерт «восстановлен» с длительностью сбоя.
 */
export function evalUptime(prev: UptimeState, result: { up: boolean }, now: Date): UptimeEval {
  if (result.up) {
    const wasDown = prev.lastValue === "down";
    const downtimeMs = wasDown && prev.downSince ? now.getTime() - prev.downSince.getTime() : 0;
    return {
      next: { lastValue: "up", failCount: 0, downSince: null },
      event: wasDown ? "recovered" : null,
      downtimeMs,
      recheckSoon: false,
    };
  }

  const failCount = prev.failCount + 1;
  const downSince = prev.downSince ?? now;
  const alreadyDown = prev.lastValue === "down";
  const confirmed = failCount >= CONFIRM_FAILURES;
  return {
    next: { lastValue: confirmed ? "down" : prev.lastValue, failCount, downSince },
    event: confirmed && !alreadyDown ? "down" : null,
    downtimeMs: 0,
    recheckSoon: !confirmed,
  };
}

/** «3 ч 12 мин» / «45 сек» — длительность сбоя по словарю. */
export function formatDuration(ms: number, a: Dict["alerts"]): string {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 60) return a.durSec(sec);
  const min = Math.round(sec / 60);
  if (min < 60) return a.durMin(min);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `${a.durHour(h)} ${a.durMin(m)}` : a.durHour(h);
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return hh ? `${a.durDay(d)} ${a.durHour(hh)}` : a.durDay(d);
}

/** Начало суток UTC — ключ дневной сводки UptimeDay. */
export function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export type DayBar = { day: Date; ratio: number | null }; // null = нет данных

/**
 * Полоса «N дней» для статус-страницы: по дням от старого к новому, доля
 * успешных проверок за день (null — в этот день не проверяли).
 */
export function buildDayBars(
  rows: { day: Date; checks: number; up: number }[],
  days: number,
  today: Date
): DayBar[] {
  const byDay = new Map(rows.map((r) => [utcDay(r.day).getTime(), r]));
  const end = utcDay(today).getTime();
  const out: DayBar[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = end - i * 86_400_000;
    const r = byDay.get(t);
    out.push({ day: new Date(t), ratio: r && r.checks > 0 ? r.up / r.checks : null });
  }
  return out;
}

/** Общий аптайм за период в процентах (null — данных нет). */
export function uptimePercent(rows: { checks: number; up: number }[]): number | null {
  const checks = rows.reduce((s, r) => s + r.checks, 0);
  if (checks === 0) return null;
  const up = rows.reduce((s, r) => s + r.up, 0);
  return (up / checks) * 100;
}

/** 99.95 → "99.95%", 100 → "100%" — без лишних нулей, но не округляя сбой до 100. */
export function formatPercent(p: number | null): string {
  if (p == null) return "—";
  if (p >= 100) return "100%";
  const fixed = Math.floor(p * 100) / 100; // 99.999 → 99.99, а не 100
  return `${fixed.toFixed(2).replace(/\.?0+$/, "")}%`;
}
