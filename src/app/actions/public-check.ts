"use server";

import { headers } from "next/headers";
import { checkUptime } from "@/lib/uptime";
import { fetchCertInfo } from "@/lib/cert";
import { fetchDomainExpiry } from "@/lib/domain";
import { normalizeSiteUrl, siteHost } from "@/lib/sites";
import { isPublicHttpUrl, rateLimit } from "@/lib/net-guard";
import {
  gradeOf,
  speedLevel,
  sslLevel,
  domainLevel,
  type Grade,
  type HealthItem,
} from "@/lib/health-report";

export type PublicCheckResult =
  | { ok: true; host: string; url: string; grade: Grade; items: HealthItem[] }
  | { ok: false; error: "invalid" | "rate" | "blocked" };

/**
 * Бесплатная проверка сайта для гостей лендинга: доступность, скорость, SSL и
 * домен — параллельно, за несколько секунд. Без регистрации, поэтому с
 * защитой от SSRF и мягким лимитом частоты по IP.
 */
export async function publicCheck(input: string): Promise<PublicCheckResult> {
  const url = normalizeSiteUrl(String(input ?? "").slice(0, 300));
  const host = siteHost(url);
  if (!url || !host) return { ok: false, error: "invalid" };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!rateLimit(`pc:${ip}`, 8, 60_000) || !rateLimit("pc:global", 120, 60_000)) {
    return { ok: false, error: "rate" };
  }
  if (!(await isPublicHttpUrl(url))) return { ok: false, error: "blocked" };

  const isHttps = url.startsWith("https:");
  const [up, cert, domain] = await Promise.all([
    checkUptime(url, 10_000, isPublicHttpUrl),
    isHttps ? fetchCertInfo(new URL(url).hostname, 8_000) : Promise.resolve(null),
    fetchDomainExpiry(url),
  ]);

  const items: HealthItem[] = [];
  items.push(
    up.up
      ? { key: "online", level: "good", ms: up.ms }
      : { key: "online", level: "bad", error: up.error }
  );
  if (up.up) items.push({ key: "speed", level: speedLevel(up.ms), ms: up.ms });

  if (!isHttps) items.push({ key: "ssl", level: "bad", error: "noHttps" });
  else if (cert?.ok) items.push({ key: "ssl", level: sslLevel(cert.daysLeft), days: cert.daysLeft });
  else items.push({ key: "ssl", level: "bad", error: cert?.error ?? "cert" });

  if (domain.ok) items.push({ key: "domain", level: domainLevel(domain.daysLeft), days: domain.daysLeft });
  else items.push({ key: "domain", level: "unknown", error: domain.error });

  return { ok: true, host, url, grade: gradeOf(items), items };
}
