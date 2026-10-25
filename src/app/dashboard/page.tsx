import Link from "next/link";
import { headers } from "next/headers";
import { getUser, getTrackers, getClients, getRecentAlerts, getUptimeHistory } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { deleteClient, setBrandName, toggleClientShare } from "@/app/actions/clients";
import { FREE_TIER_TRACKER_LIMIT } from "@/lib/validation";
import { getLocale, getDict, type Dict } from "@/lib/i18n";
import { groupSites, siteHealth, type SiteGroup } from "@/lib/sites";
import { formatDuration, formatPercent, uptimePercent } from "@/lib/uptime";
import AddTrackerForm from "./add-tracker-form";
import AddClientForm from "./add-client-form";
import AddSiteForm from "./add-site-form";
import TelegramLink from "./telegram-link";
import TrackerItem from "./tracker-item";
import SiteCard, { type SiteTracker } from "./site-card";
import CopyLink from "./copy-link";
import ConfirmButton from "./confirm-button";
import LanguageSwitcher from "../language-switcher";

function timeAgo(date: Date, t: Dict["timeAgo"]): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return t.justNow;
  const min = Math.floor(sec / 60);
  if (min < 60) return t.minutes(min);
  const hr = Math.floor(min / 60);
  if (hr < 24) return t.hours(hr);
  return t.days(Math.floor(hr / 24));
}

/** «12 мин» — сколько уже длится сбой. */
function downFor(since: Date, a: Dict["alerts"]): string {
  return formatDuration(Date.now() - since.getTime(), a);
}

type TrackerRow = Awaited<ReturnType<typeof getTrackers>>[number];

function Tile({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-3.5">
      <p className="text-xs text-mute">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${tone}`}>{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const [user, trackers, clients, alerts, history, locale] = await Promise.all([
    getUser(),
    getTrackers(),
    getClients(),
    getRecentAlerts(),
    getUptimeHistory(),
    getLocale(),
  ]);
  const dict = getDict(locale);
  const d = dict.dashboard;
  const c = dict.clients;
  const s = dict.sites;
  const atLimit = trackers.length >= FREE_TIER_TRACKER_LIMIT;

  // Базовый URL для публичных статус-ссылок (из заголовков запроса).
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = host ? `${proto}://${host}` : "";

  const { sites, others } = groupSites<TrackerRow>(trackers);

  // Дневные сводки по трекеру аптайма.
  const daysByTracker = new Map<string, typeof history.days>();
  for (const row of history.days) {
    const arr = daysByTracker.get(row.trackerId);
    if (arr) arr.push(row);
    else daysByTracker.set(row.trackerId, [row]);
  }

  // Сводка наверху.
  const health = sites.map((g) => siteHealth(g));
  const monitoredUp = sites.filter((g) => g.uptime?.isActive);
  const upNow = monitoredUp.filter((g) => g.uptime?.lastValue === "up").length;
  const anyDown = health.includes("down");
  const uptime30 = formatPercent(uptimePercent(history.days));

  // Проблемные сайты — наверх: лежит > внимание > проверяется > работает.
  const SEVERITY = { down: 0, warn: 1, pending: 2, up: 3, paused: 4 } as const;
  const sorted = [...sites].sort((a, b) => SEVERITY[siteHealth(a)] - SEVERITY[siteHealth(b)]);

  const sitesByClient = new Map<string | null, SiteGroup<TrackerRow>[]>();
  for (const g of sorted) {
    const arr = sitesByClient.get(g.clientId);
    if (arr) arr.push(g);
    else sitesByClient.set(g.clientId, [g]);
  }

  const renderSite = (g: SiteGroup<TrackerRow>) => {
    const last = g.all
      .map((t) => t.lastCheckedAt)
      .filter((x): x is Date => !!x)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const downSince = g.uptime?.lastValue === "down" ? g.uptime.downSince : null;
    return (
      <SiteCard
        key={g.key}
        site={g as SiteGroup<SiteTracker>}
        days={g.uptime ? daysByTracker.get(g.uptime.id) ?? [] : []}
        s={s}
        locale={locale}
        clients={clients}
        checkedAgo={last ? timeAgo(last, dict.timeAgo) : null}
        downFor={downSince ? downFor(downSince, dict.alerts) : null}
      />
    );
  };

  const renderOthers = (list: TrackerRow[]) => (
    <ul className="flex flex-col gap-2">
      {list.map((t) => (
        <TrackerItem
          key={t.id}
          d={d}
          form={dict.form}
          clients={clients}
          clientsDict={c}
          t={{
            id: t.id,
            name: t.name,
            mode: t.mode,
            url: t.url,
            selector: t.selector,
            type: t.type,
            asset: t.asset,
            assetCondition: t.assetCondition,
            threshold: t.threshold,
            clientId: t.clientId,
            intervalMinutes: t.intervalMinutes,
            status: t.status,
            lastValue: t.lastValue,
            isActive: t.isActive,
          }}
        />
      ))}
    </ul>
  );

  const unassignedSites = sitesByClient.get(null) ?? [];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-sm text-canvas">
              W
            </span>
            {dict.common.appName}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} />
            <form action={logout}>
              <button type="submit" className="rounded-full px-3 py-1.5 text-sm text-mute hover:bg-sunken">
                {dict.common.logout}
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
        {/* Итог одной строкой — как табло */}
        {sites.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2.5">
              <span className={`inline-block h-3 w-3 rounded-full pulse-dot ${anyDown ? "bg-down" : "bg-up"}`} />
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {anyDown ? s.someDown : s.allGood}
              </h1>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label={s.tileSites} value={String(sites.length)} />
              <Tile
                label={s.tileUp}
                value={`${upNow}/${monitoredUp.length}`}
                tone={anyDown ? "text-down" : "text-up"}
              />
              <Tile label={s.tileIncidents} value={String(history.incidents.length)} />
              <Tile label={s.tileUptime} value={uptime30} />
            </div>
          </section>
        )}

        {!user?.telegramChatId && sites.length > 0 && (
          <section className="flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{s.connectTelegramTitle}</p>
              <p className="mt-1 max-w-lg text-sm text-mute">{s.connectTelegramText}</p>
            </div>
            <TelegramLink linked={false} dict={dict.telegram} />
          </section>
        )}

        <AddSiteForm dict={s} clients={clients} />

        {/* Сайты по клиентам */}
        {sites.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-line p-8 text-center">
            <p className="text-lg font-semibold tracking-tight">{s.emptyTitle}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-mute">{s.emptyText}</p>
          </section>
        ) : (
          <section className="flex flex-col gap-8">
            {clients.map((client) => {
              const list = sitesByClient.get(client.id) ?? [];
              const statusUrl = client.shareToken ? `${baseUrl}/status/${client.shareToken}` : null;
              return (
                <div key={client.id}>
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold tracking-tight">
                        {client.name}{" "}
                        <span className="text-sm font-normal text-faint">· {list.length}</span>
                      </h2>
                      <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-mute">
                        <span className="shrink-0">{s.statusPage}:</span>
                        {statusUrl ? (
                          <CopyLink url={statusUrl} copyLabel={s.copy} copiedLabel={s.copied} />
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <form action={toggleClientShare}>
                        <input type="hidden" name="id" value={client.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-line px-3 py-1 text-xs hover:bg-sunken"
                        >
                          {client.shareToken ? c.shareDisable : c.shareEnable}
                        </button>
                      </form>
                      <form action={deleteClient}>
                        <input type="hidden" name="id" value={client.id} />
                        <ConfirmButton
                          message={c.deleteTitle}
                          className="rounded-full px-3 py-1 text-xs text-down hover:bg-down-soft"
                        >
                          {c.delete}
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                  {list.length > 0 ? (
                    <ul className="flex flex-col gap-3">{list.map(renderSite)}</ul>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-mute">
                      {c.noTrackers}
                    </p>
                  )}
                </div>
              );
            })}

            {unassignedSites.length > 0 && (
              <div>
                {clients.length > 0 && (
                  <h2 className="mb-3 text-lg font-semibold tracking-tight text-mute">{c.unassigned}</h2>
                )}
                <ul className="flex flex-col gap-3">{unassignedSites.map(renderSite)}</ul>
              </div>
            )}
          </section>
        )}

        {/* Последние срабатывания */}
        {trackers.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">{d.recentAlerts}</h2>
            {alerts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-mute">{d.noAlerts}</p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
                {alerts.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{a.tracker.name}</p>
                      <p className="text-mute">{a.message}</p>
                    </div>
                    <span className="shrink-0 text-xs text-faint">{timeAgo(a.createdAt, dict.timeAgo)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Прочие трекеры: цены, селекторы, активы */}
        <section>
          <h2 className="text-lg font-semibold tracking-tight">{s.otherTitle}</h2>
          <p className="mb-3 text-sm text-mute">{s.otherSubtitle}</p>
          {others.length > 0 && <div className="mb-3">{renderOthers(others)}</div>}
          <details className="group rounded-2xl border border-line bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium marker:content-none">
              {s.otherAdd}
              <span className="text-faint transition group-open:rotate-45">+</span>
            </summary>
            <div className="border-t border-line p-1">
              <AddTrackerForm disabled={atLimit} dict={dict.form} clients={clients} clientsDict={c} />
            </div>
          </details>
        </section>

        {/* Настройки */}
        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">{s.settingsTitle}</h2>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            <div className="p-4">
              <p className="text-sm font-medium">{c.title}</p>
              <p className="mb-3 text-sm text-mute">{c.intro}</p>
              <AddClientForm dict={c} />
            </div>
            <form action={setBrandName} className="flex flex-col gap-2 p-4">
              <label htmlFor="brandName" className="text-sm font-medium">
                {c.brandLabel}
              </label>
              <div className="flex gap-2">
                <input
                  id="brandName"
                  name="brandName"
                  defaultValue={user?.brandName ?? ""}
                  placeholder={c.brandPlaceholder}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button type="submit" className="shrink-0 rounded-lg border border-line px-4 py-2 text-sm hover:bg-sunken">
                  {c.brandSave}
                </button>
              </div>
            </form>
            <div className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <p className="text-sm font-medium">{s.telegramLabel}</p>
                <TelegramLink linked={!!user?.telegramChatId} dict={dict.telegram} />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{s.accountLabel}</p>
                <p className="text-sm text-mute">{user?.email}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
