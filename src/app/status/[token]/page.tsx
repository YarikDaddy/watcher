import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientByShareToken } from "@/lib/dal";
import { getLocale, getDict, type Dict } from "@/lib/i18n";
import { groupSites, siteHealth, type SiteHealth } from "@/lib/sites";
import { buildDayBars, formatDuration, formatPercent, uptimePercent } from "@/lib/uptime";
import { checkErrorMessage } from "@/lib/check";
import { StatusDot, UptimeBars } from "@/app/ui/uptime-bars";

type Params = { params: Promise<{ token: string }> };

// Публичная страница всегда свежая — клиент открывает её, когда что-то не так.
export const dynamic = "force-dynamic";

function timeAgo(date: Date | null, t: Dict["timeAgo"], never: string): string {
  if (!date) return never;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return t.justNow;
  const min = Math.floor(sec / 60);
  if (min < 60) return t.minutes(min);
  const hr = Math.floor(min / 60);
  if (hr < 24) return t.hours(hr);
  return t.days(Math.floor(hr / 24));
}

const HEALTH_TONE: Record<SiteHealth, string> = {
  up: "text-up",
  down: "text-down",
  warn: "text-warn",
  pending: "text-mute",
  paused: "text-mute",
};

export async function generateMetadata({ params }: Params) {
  const { token } = await params;
  const client = await getClientByShareToken(token);
  if (!client) return { title: "Status" };
  const brand = client.user.brandName || "Watcher";
  return { title: `${client.name} — ${brand}`, robots: { index: false } };
}

export default async function StatusPage({ params }: Params) {
  const { token } = await params;
  const [client, locale] = await Promise.all([getClientByShareToken(token), getLocale()]);
  if (!client) notFound();

  const dict = getDict(locale);
  const sp = dict.statusPage;
  const brand = client.user.brandName || "Watcher";
  const now = new Date();

  // Публично показываем только активные проверки.
  const active = client.trackers.filter((t) => t.isActive);
  const { sites, others } = groupSites(active);
  // Клиенту не показываем «внимание» из-за SSL/домена, до истечения которых
  // ещё есть дни, — это забота агентства; жёлтый только для реальных проблем.
  const health = sites.map((g) => siteHealth(g, 0));
  const otherProblem = others.some((t) => t.status === "ERROR");
  const anyDown = health.includes("down");
  const anyWarn = health.includes("warn") || otherProblem;

  const lastChecked =
    active
      .map((t) => t.lastCheckedAt)
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const incidents = active
    .flatMap((t) => t.incidents.map((i) => ({ ...i, site: t.name })))
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, 15);

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const banner = anyDown
    ? { text: sp.hasIssues, box: "border-down/30 bg-down-soft", dot: "bg-down" }
    : anyWarn
      ? { text: sp.hasIssues, box: "border-warn/30 bg-warn-soft", dot: "bg-warn" }
      : { text: sp.allOk, box: "border-up/30 bg-up-soft", dot: "bg-up" };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <header className="mb-8">
          <p className="text-sm font-medium text-mute">{brand}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {client.name}
          </h1>
          <p className="mt-1 text-mute">{sp.title}</p>
        </header>

        <div className={`mb-8 flex items-center gap-3 rounded-2xl border p-5 ${banner.box}`}>
          <span className={`pulse-dot h-3 w-3 shrink-0 rounded-full ${banner.dot}`} />
          <p className="text-lg font-semibold tracking-tight">
            {active.length === 0 ? sp.allOk : banner.text}
          </p>
        </div>

        {active.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-mute">
            {sp.empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sites.map((g, i) => {
              const h = health[i];
              const days = g.uptime?.uptimeDays ?? [];
              const pct = formatPercent(uptimePercent(days));
              const upCount = days.reduce((s, d) => s + d.up, 0);
              const avg = upCount ? Math.round(days.reduce((s, d) => s + d.totalMs, 0) / upCount) : null;
              const certDays = g.cert?.lastValue != null ? Number(g.cert.lastValue) : null;
              const domDays = g.domain?.lastValue != null ? Number(g.domain.lastValue) : null;
              const label =
                h === "up"
                  ? sp.operational
                  : h === "down"
                    ? sp.down
                    : h === "warn"
                      ? sp.attention
                      : sp.checking;
              return (
                <li key={g.key} className="rounded-2xl border border-line bg-card p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <StatusDot health={h} />
                      <p className="truncate text-[17px] font-semibold tracking-tight">{g.host}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-medium ${HEALTH_TONE[h]}`}>{label}</p>
                  </div>

                  {g.uptime && (
                    <>
                      <UptimeBars
                        bars={buildDayBars(days, 90, now)}
                        locale={locale}
                        noData={sp.noData}
                        className="mt-4 h-9"
                      />
                      <div className="mt-2 flex items-center justify-between text-xs text-faint">
                        <span>{sp.daysAgo90}</span>
                        <span className="font-medium text-mute">
                          {pct} {sp.uptime}
                        </span>
                        <span>{sp.today}</span>
                      </div>
                    </>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
                    {avg != null && (
                      <span className="tabular-nums">
                        {sp.avgResponse} {avg} ms
                      </span>
                    )}
                    {certDays != null && Number.isFinite(certDays) && (
                      <span className={certDays <= 0 ? "text-down" : certDays <= 14 ? "text-warn" : ""}>
                        🔒 {certDays <= 0 ? sp.sslExpired : `${sp.sslValid} ${certDays} ${sp.daysShort}`}
                      </span>
                    )}
                    {domDays != null && Number.isFinite(domDays) && (
                      <span className={domDays <= 0 ? "text-down" : domDays <= 30 ? "text-warn" : ""}>
                        🌐 {domDays <= 0 ? sp.domainExpired : `${sp.domainRenews} ${domDays} ${sp.daysShort}`}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}

            {others.length > 0 && (
              <li className="overflow-hidden rounded-2xl border border-line bg-card">
                <p className="border-b border-line px-5 py-3 text-sm font-medium text-mute">{sp.otherChecks}</p>
                <ul className="divide-y divide-line">
                  {others.map((t) => {
                    const tone =
                      t.status === "ERROR" ? "text-down" : t.status === "CHANGED" ? "text-warn" : t.status === "OK" ? "text-up" : "text-mute";
                    const text =
                      t.status === "ERROR" ? sp.problem : t.status === "CHANGED" ? sp.attention : t.status === "OK" ? sp.operational : sp.checking;
                    return (
                      <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                        <span className="truncate font-medium">{t.name}</span>
                        <span className={`shrink-0 ${tone}`}>{text}</span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            )}
          </ul>
        )}

        {sites.some((g) => g.uptime) && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">{sp.incidentsTitle}</h2>
            {incidents.length === 0 ? (
              <p className="mt-3 text-sm text-mute">{sp.noIncidents}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {incidents.map((i) => {
                  const ongoing = !i.endedAt;
                  const dur = formatDuration((i.endedAt ?? now).getTime() - i.startedAt.getTime(), dict.alerts);
                  return (
                    <li key={i.id} className="rounded-2xl border border-line bg-card p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{i.site}</p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            ongoing ? "bg-down-soft text-down" : "bg-up-soft text-up"
                          }`}
                        >
                          {ongoing ? sp.ongoing : sp.resolved}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-mute">
                        {dateFmt.format(i.startedAt)} · {sp.lasted} {dur} · {checkErrorMessage(i.cause, dict.errors)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <footer className="mt-12 flex items-center justify-between border-t border-line pt-6 text-xs text-faint">
          <span>
            {sp.updated} {timeAgo(lastChecked, dict.timeAgo, sp.neverChecked)}
          </span>
          <span>
            {sp.poweredBy}{" "}
            <Link href="/" className="font-medium text-mute hover:underline">
              Watcher
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
