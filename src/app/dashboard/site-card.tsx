import { deleteSite, moveSite, toggleSite } from "@/app/actions/sites";
import { siteHealth, type SiteGroup, type SiteHealth } from "@/lib/sites";
import { buildDayBars, formatPercent, uptimePercent } from "@/lib/uptime";
import type { Dict } from "@/lib/i18n";
import { StatusDot, UptimeBars } from "../ui/uptime-bars";
import ConfirmButton from "./confirm-button";

export type SiteTracker = {
  id: string;
  mode: string;
  url: string | null;
  clientId: string | null;
  status: string;
  lastValue: string | null;
  lastError: string | null;
  isActive: boolean;
  responseMs: number | null;
  downSince: Date | null;
  lastCheckedAt: Date | null;
};

type DayRow = { day: Date; checks: number; up: number };

const HEALTH_TEXT: Record<SiteHealth, string> = {
  up: "text-up",
  down: "text-down",
  warn: "text-warn",
  pending: "text-mute",
  paused: "text-mute",
};

/** «SSL 54 дн» / «SSL истёк» / ошибка проверки — со своим цветом. */
function ExpiryChip({
  label,
  t,
  s,
}: {
  label: string;
  t: SiteTracker | undefined;
  s: Dict["sites"];
}) {
  if (!t) return null;
  if (!t.isActive) return <span className="text-faint">{label} · {s.paused}</span>;
  if (t.status === "ERROR" && t.lastValue == null) {
    return (
      <span className="text-warn" title={t.lastError ?? ""}>
        {label} · ⚠
      </span>
    );
  }
  if (t.lastValue == null) return <span className="text-faint">{label} · …</span>;
  const d = Number(t.lastValue);
  const tone = d <= 0 ? "text-down" : d <= 14 ? "text-warn" : "text-mute";
  return (
    <span className={tone}>
      {label} · {d <= 0 ? s.expired : `${d} ${s.days}`}
    </span>
  );
}

export default function SiteCard({
  site,
  days,
  s,
  locale,
  clients,
  checkedAgo,
  downFor,
}: {
  site: SiteGroup<SiteTracker>;
  days: DayRow[];
  s: Dict["sites"];
  locale: string;
  clients: { id: string; name: string }[];
  checkedAgo: string | null;
  downFor: string | null;
}) {
  const health = siteHealth(site);
  const ids = site.all.map((t) => t.id).join(",");
  const up = site.uptime;
  const pct = formatPercent(uptimePercent(days));
  const label =
    health === "up"
      ? s.up
      : health === "down"
        ? `${s.down}${downFor ? ` · ${downFor}` : ""}`
        : health === "warn"
          ? s.attention
          : health === "paused"
            ? s.paused
            : s.checking;

  return (
    <li className="group rounded-2xl border border-line bg-card p-4 transition hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <StatusDot health={health} />
            <a
              href={up?.url ?? site.all[0]?.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-[17px] font-semibold tracking-tight hover:underline"
            >
              {site.host}
            </a>
          </div>
          <p className={`mt-0.5 pl-5 text-sm ${HEALTH_TEXT[health]}`}>{label}</p>
        </div>
        {up && (
          <div className="shrink-0 text-right">
            <p className="text-[17px] font-semibold tabular-nums tracking-tight">{pct}</p>
            <p className="text-xs text-faint">{s.uptime30}</p>
          </div>
        )}
      </div>

      {up && (
        <UptimeBars
          bars={buildDayBars(days, 30, new Date())}
          locale={locale}
          noData="—"
          className="mt-4 h-7"
        />
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {up?.responseMs != null && up.isActive && (
            <span className="tabular-nums text-mute">
              {s.response} {up.responseMs} ms
            </span>
          )}
          {site.cert ? (
            <ExpiryChip label={s.ssl} t={site.cert} s={s} />
          ) : (
            up?.url?.startsWith("http:") && <span className="text-faint">{s.noSsl}</span>
          )}
          <ExpiryChip label={s.domain} t={site.domain} s={s} />
          {checkedAgo && (
            <span className="text-faint">
              {s.checked} {checkedAgo}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          {clients.length > 0 && (
            <form action={moveSite} className="flex items-center">
              <input type="hidden" name="ids" value={ids} />
              <select
                name="clientId"
                defaultValue={site.clientId ?? ""}
                aria-label={s.moveTo}
                className="rounded-md border border-line bg-card px-1.5 py-1 text-xs text-mute"
              >
                <option value="">{s.noClient}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-md px-1.5 py-1 text-xs text-mute hover:bg-sunken">
                ↵
              </button>
            </form>
          )}
          <form action={toggleSite}>
            <input type="hidden" name="ids" value={ids} />
            <button type="submit" className="rounded-md px-2 py-1 text-xs text-mute hover:bg-sunken">
              {health === "paused" ? s.resume : s.pause}
            </button>
          </form>
          <form action={deleteSite}>
            <input type="hidden" name="ids" value={ids} />
            <ConfirmButton
              message={s.removeConfirm}
              className="rounded-md px-2 py-1 text-xs text-down hover:bg-down-soft"
            >
              {s.remove}
            </ConfirmButton>
          </form>
        </div>
      </div>
    </li>
  );
}
