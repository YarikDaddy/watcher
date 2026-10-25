import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Защита от SSRF для публичных проверок (без регистрации): гость не должен
 * заставить наш сервер ходить во внутреннюю сеть (localhost, 10.x, метаданные
 * облака 169.254.169.254 и т.п.). Проверяем КАЖДЫЙ адрес, в который
 * резолвится хост, и каждый шаг редиректа.
 */

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local + метаданные облаков
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const n = ipv4ToInt(ip);
    return V4_BLOCKED.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v); // ULA, link-local, multicast
  }
  return true; // не IP — на всякий случай запрещаем
}

/** URL безопасен для запроса с нашего сервера: http(s), стандартный порт, публичные IP. */
export async function isPublicHttpUrl(raw: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.port && url.port !== "80" && url.port !== "443") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) return !isPrivateIp(host);
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }
  try {
    const addrs = await lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
  } catch {
    return false;
  }
}

// ---------- Простой rate limit (в памяти инстанса) ----------

const hits = new Map<string, number[]>();

/**
 * true — запрос можно выполнить. Окно скользящее. На serverless у каждого
 * инстанса своя память, так что это «мягкая» защита от спама, а не биллинг.
 */
export function rateLimit(key: string, limit = 6, windowMs = 60_000): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear(); // не даём карте расти бесконечно
  return true;
}
