import net from "node:net";
import { domainToASCII } from "node:url";

const MS_PER_DAY = 86_400_000;

export type DomainResult =
  | { ok: true; daysLeft: number; expiresAt: Date; domain: string }
  | { ok: false; error: string };

// Вторые уровни, где регистрируют на третьем: shop.com.ru → регистрируемый
// домен shop.com.ru, а не com.ru. Не полный Public Suffix List, но покрывает
// наш рынок (RU/UA/KZ/BY + частые международные).
const MULTI_LEVEL = new Set([
  "com.ru", "net.ru", "org.ru", "pp.ru", "msk.ru", "spb.ru", "msk.su",
  "com.ua", "org.ua", "net.ua", "kiev.ua", "in.ua",
  "com.kz", "org.kz", "com.by", "co.uk", "org.uk", "me.uk",
  "com.au", "net.au", "co.jp", "co.nz", "com.br", "com.tr", "co.il", "co.za",
]);

// Поддомены хостингов: сайт на acme.vercel.app не владеет доменом — срок
// регистрации vercel.app клиенту ничего не говорит, мониторить нечего.
const PLATFORM_SUFFIXES = [
  "vercel.app", "netlify.app", "github.io", "pages.dev", "workers.dev", "web.app",
  "firebaseapp.com", "herokuapp.com", "onrender.com", "railway.app", "fly.dev",
  "tilda.ws", "wixsite.com", "webflow.io", "framer.website", "myshopify.com",
  "ucoz.ru", "narod.ru", "blogspot.com", "wordpress.com",
];

/** Хост на поддомене хостинга (acme.vercel.app) — домен не принадлежит сайту. */
export function isPlatformHost(host: string): boolean {
  const h = host.toLowerCase();
  return PLATFORM_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`));
}

/** Регистрируемый домен из URL/хоста: https://shop.acme.ru/x → acme.ru (punycode). */
export function registrableDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let host = input.trim();
  try {
    host = new URL(host.includes("://") ? host : `https://${host}`).hostname;
  } catch {
    return null;
  }
  host = domainToASCII(host.replace(/\.$/, "").toLowerCase());
  if (!host || !host.includes(".") || /^[\d.]+$/.test(host)) return null; // IP — не домен
  const parts = host.split(".");
  const take = MULTI_LEVEL.has(parts.slice(-2).join(".")) ? 3 : 2;
  return parts.slice(-take).join(".");
}

// ---------- RDAP (современная замена WHOIS, JSON) ----------

let bootstrap: { at: number; map: Map<string, string> } | null = null;

/** Таблица IANA «зона → RDAP-сервер», кешируется на сутки. */
async function rdapServerFor(tld: string): Promise<string | null> {
  if (!bootstrap || Date.now() - bootstrap.at > MS_PER_DAY) {
    const res = await fetch("https://data.iana.org/rdap/dns.json", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`bootstrap ${res.status}`);
    const json = (await res.json()) as { services: [string[], string[]][] };
    const map = new Map<string, string>();
    for (const [tlds, urls] of json.services) {
      for (const t of tlds) map.set(t.toLowerCase(), urls[0]);
    }
    bootstrap = { at: Date.now(), map };
  }
  return bootstrap.map.get(tld) ?? null;
}

/** Дата истечения из RDAP-ответа (events[].eventAction = "expiration"). */
export function expiryFromRdap(json: unknown): Date | null {
  const events = (json as { events?: { eventAction?: string; eventDate?: string }[] })?.events;
  if (!Array.isArray(events)) return null;
  const ev = events.find((e) => e.eventAction === "expiration" && e.eventDate);
  if (!ev?.eventDate) return null;
  const d = new Date(ev.eventDate);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function rdapExpiry(domain: string): Promise<Date | "notFound" | null> {
  const tld = domain.split(".").pop()!;
  const server = await rdapServerFor(tld);
  if (!server) return null; // зона без RDAP → пробуем WHOIS
  const base = server.endsWith("/") ? server : `${server}/`;
  const res = await fetch(`${base}domain/${domain}`, {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: "application/rdap+json, application/json" },
  });
  if (res.status === 404) return "notFound";
  if (!res.ok) return null;
  return expiryFromRdap(await res.json());
}

// ---------- WHOIS (порт 43) — для зон без RDAP: .ru, .рф, .su, .io, .kz ... ----------

// Известные серверы — без лишнего запроса к whois.iana.org.
const WHOIS_SERVERS: Record<string, string> = {
  ru: "whois.tcinet.ru",
  su: "whois.tcinet.ru",
  "xn--p1ai": "whois.tcinet.ru", // .рф
};

function whoisQuery(server: string, query: string, timeoutMs = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    // autoSelectFamilyAttemptTimeout: по умолчанию Node даёт адресу 250 мс и
    // переключается на следующий — медленные WHOIS-серверы так не успевают.
    const socket = net.connect(
      { host: server, port: 43, timeout: timeoutMs, autoSelectFamilyAttemptTimeout: 3000 },
      () => {
        socket.write(`${query}\r\n`);
      }
    );
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      data += chunk;
      if (data.length > 200_000) socket.destroy(); // защита от бесконечного ответа
    });
    socket.on("end", () => resolve(data));
    socket.on("close", () => resolve(data));
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("timeout"));
    });
    socket.on("error", reject);
  });
}

// Строки с датой истечения в разных форматах реестров.
const EXPIRY_RE =
  /^\s*(?:paid-till|registry expiry date|registrar registration expiration date|expiration date|expiry date|expires(?: on)?|expire|renewal date|valid until|free-date)\s*:\s*(.+)$/im;

/** Дата истечения из текстового WHOIS-ответа (null — не нашли). */
export function expiryFromWhois(text: string): Date | null {
  const m = text.match(EXPIRY_RE);
  if (!m) return null;
  const raw = m[1].trim();
  // 2027.09.30 / 30.09.2027 / 2027-09-30T21:00:00Z
  const iso = raw
    .replace(/^(\d{4})\.(\d{2})\.(\d{2})/, "$1-$2-$3")
    .replace(/^(\d{2})\.(\d{2})\.(\d{4})/, "$3-$2-$1");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function whoisExpiry(domain: string): Promise<Date | "notFound" | null> {
  const tld = domain.split(".").pop()!;
  let server = WHOIS_SERVERS[tld];
  if (!server) {
    const iana = await whoisQuery("whois.iana.org", tld);
    server = iana.match(/^\s*(?:refer|whois):\s*(\S+)/im)?.[1] ?? "";
    if (!server) return null;
  }
  const text = await whoisQuery(server, domain);
  if (/no entries found|not found|no match|no data found|is free/i.test(text) && !EXPIRY_RE.test(text)) {
    return "notFound";
  }
  return expiryFromWhois(text);
}

/** Срок регистрации домена: RDAP, а если зона без RDAP — WHOIS. */
export async function fetchDomainExpiry(input: string): Promise<DomainResult> {
  const domain = registrableDomain(input);
  if (!domain) return { ok: false, error: "urlInvalid" };
  if (isPlatformHost(domain)) return { ok: false, error: "domainPlatform" };

  let expires: Date | "notFound" | null = null;
  try {
    expires = await rdapExpiry(domain);
  } catch {
    expires = null;
  }
  if (expires == null) {
    try {
      expires = await whoisExpiry(domain);
    } catch (err) {
      return { ok: false, error: err instanceof Error && err.message === "timeout" ? "timeout" : "domainLookup" };
    }
  }
  if (expires === "notFound") return { ok: false, error: "domainNotFound" };
  if (expires == null) return { ok: false, error: "domainNoExpiry" };

  const daysLeft = Math.floor((expires.getTime() - Date.now()) / MS_PER_DAY);
  return { ok: true, daysLeft, expiresAt: expires, domain };
}
