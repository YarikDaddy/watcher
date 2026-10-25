// «Сайт» — то, как агентство думает о работе: не три монитора, а один
// acme.ru с аптаймом, SSL и доменом. Чистая группировка трекеров по хосту.

// Ключ localStorage: лендинг (бесплатная проверка) запоминает сайт гостя —
// после регистрации поле «Добавить сайт» уже заполнено.
export const PENDING_SITE_KEY = "watcher:pendingSite";

export const SITE_MODES = ["UPTIME", "CERT", "DOMAIN"] as const;
export type SiteMode = (typeof SITE_MODES)[number];

export const isSiteMode = (mode: string): mode is SiteMode =>
  (SITE_MODES as readonly string[]).includes(mode);

/** acme.ru из https://www.acme.ru/path — ключ сайта (без www). */
export function siteHost(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

/** Пользовательский ввод «acme.ru» → «https://acme.ru» (схема по умолчанию https). */
export function normalizeSiteUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    return u.toString();
  } catch {
    return null;
  }
}

type Groupable = { id: string; mode: string; url: string | null; clientId: string | null };

export type SiteGroup<T> = {
  key: string;
  host: string;
  clientId: string | null;
  uptime?: T;
  cert?: T;
  domain?: T;
  all: T[];
};

/**
 * Группирует трекеры режимов UPTIME/CERT/DOMAIN по (клиент, хост); остальные
 * (цены, селекторы, активы) возвращает отдельно. Порядок — по первому появлению.
 */
export function groupSites<T extends Groupable>(trackers: T[]): { sites: SiteGroup<T>[]; others: T[] } {
  const map = new Map<string, SiteGroup<T>>();
  const others: T[] = [];
  for (const t of trackers) {
    const host = isSiteMode(t.mode) ? siteHost(t.url) : null;
    if (!host) {
      others.push(t);
      continue;
    }
    const key = `${t.clientId ?? "-"}|${host}`;
    let g = map.get(key);
    if (!g) {
      g = { key, host, clientId: t.clientId, all: [] };
      map.set(key, g);
    }
    g.all.push(t);
    if (t.mode === "UPTIME") g.uptime ??= t;
    else if (t.mode === "CERT") g.cert ??= t;
    else g.domain ??= t;
  }
  return { sites: [...map.values()], others };
}

export type SiteHealth = "up" | "down" | "warn" | "pending" | "paused";

/**
 * Итоговое состояние сайта для точки-индикатора: лежит > истекает/ошибка >
 * ждёт проверки > работает. Пауза — если все проверки сайта на паузе.
 */
export function siteHealth(
  g: SiteGroup<{ status: string; lastValue: string | null; isActive: boolean; mode: string }>,
  soonDays = 14
): SiteHealth {
  const active = g.all.filter((t) => t.isActive);
  if (active.length === 0) return "paused";
  if (g.uptime?.isActive && g.uptime.lastValue === "down") return "down";
  const expiring = [g.cert, g.domain].some((t) => {
    if (!t?.isActive || t.lastValue == null) return false;
    const d = Number(t.lastValue);
    return Number.isFinite(d) && d <= soonDays;
  });
  if (expiring || active.some((t) => t.status === "ERROR")) return "warn";
  if (active.some((t) => t.status === "PENDING")) return "pending";
  return "up";
}
