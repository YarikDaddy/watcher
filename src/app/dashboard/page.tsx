import { getUser, getTrackers, getRecentAlerts } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { deleteTracker } from "@/app/actions/trackers";
import { FREE_TIER_TRACKER_LIMIT } from "@/lib/validation";
import { assetLabel, assetUnit } from "@/lib/assets";
import { getLocale, getDict, type Dict } from "@/lib/i18n";
import AddTrackerForm from "./add-tracker-form";
import TelegramLink from "./telegram-link";
import LanguageSwitcher from "../language-switcher";

function assetConditionText(
  condition: string | null,
  threshold: number | null,
  unit: string
): string {
  const u = unit ? ` ${unit}` : "";
  if (condition === "ABOVE") return `${threshold}${u} ↑`;
  if (condition === "BELOW") return `${threshold}${u} ↓`;
  if (condition === "PERCENT") return `±${threshold}%`;
  return "";
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: "text-gray-500",
  OK: "text-green-600",
  CHANGED: "text-blue-600 font-medium",
  ERROR: "text-red-500",
};

function intervalLabel(minutes: number, d: Dict["dashboard"]): string {
  if (minutes < 60) return `${minutes} ${d.minShort}`;
  const hours = minutes / 60;
  if (hours === 24) return d.dayShort;
  return `${hours} ${d.hourShort}`;
}

function timeAgo(date: Date, t: Dict["dashboard"]["timeAgo"]): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return t.justNow;
  const min = Math.floor(sec / 60);
  if (min < 60) return t.minutes(min);
  const hr = Math.floor(min / 60);
  if (hr < 24) return t.hours(hr);
  return t.days(Math.floor(hr / 24));
}

export default async function DashboardPage() {
  const [user, trackers, alerts, locale] = await Promise.all([
    getUser(),
    getTrackers(),
    getRecentAlerts(),
    getLocale(),
  ]);
  const dict = getDict(locale);
  const d = dict.dashboard;
  const atLimit = trackers.length >= FREE_TIER_TRACKER_LIMIT;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{dict.common.appName}</h1>
        <div className="flex items-center gap-3">
          <LanguageSwitcher locale={locale} />
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {dict.common.logout}
            </button>
          </form>
        </div>
      </header>

      <section className="mb-8 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <p className="text-sm text-gray-500">{d.loggedInAs}</p>
        <p className="font-medium">{user?.email}</p>
        <TelegramLink linked={!!user?.telegramChatId} dict={dict.telegram} />
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">
            {d.trackers}{" "}
            <span className="text-sm font-normal text-gray-500">
              {trackers.length} / {FREE_TIER_TRACKER_LIMIT}
            </span>
          </h2>
        </div>

        {trackers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 dark:border-gray-700">
            <p className="font-medium">{d.emptyTitle}</p>
            <ol className="mt-3 flex flex-col gap-1.5 text-sm text-gray-500">
              {d.onboarding.map((step, i) => (
                <li key={i}>
                  {i + 1}. {step}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {trackers.map((t) => {
              const statusClass = STATUS_CLASS[t.status] ?? STATUS_CLASS.PENDING;
              const statusText =
                d.statuses[t.status as keyof typeof d.statuses] ?? d.statuses.PENDING;
              return (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.name}</p>
                    {t.mode === "ASSET" ? (
                      <p className="truncate text-sm text-gray-500">
                        📈 {assetLabel(t.asset ?? "")}
                        {t.lastValue
                          ? ` · ${d.nowPrefix} ${t.lastValue}${assetUnit(t.asset ?? "") ? ` ${assetUnit(t.asset ?? "")}` : ""}`
                          : ""}
                      </p>
                    ) : (
                      t.url && (
                        <a
                          href={t.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-sm text-blue-600 hover:underline"
                        >
                          {t.url}
                        </a>
                      )
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {t.mode === "ASSET" ? (
                        <>
                          {d.alertPrefix}{" "}
                          {assetConditionText(t.assetCondition, t.threshold, assetUnit(t.asset ?? ""))}
                        </>
                      ) : t.mode === "PRICE" ? (
                        <>{d.priceLabel}</>
                      ) : (
                        <code>{t.selector}</code>
                      )}{" "}
                      · {d.every} {intervalLabel(t.intervalMinutes, d)} ·{" "}
                      <span className={statusClass}>{statusText}</span>
                    </p>
                  </div>
                  <form action={deleteTracker}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-sm text-red-500 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-950/40"
                    >
                      {d.delete}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {trackers.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-medium">{d.recentAlerts}</h2>
          {alerts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700">
              {d.noAlerts}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800"
                >
                  <div className="min-w-0">
                    <p className="font-medium">🔔 {a.tracker.name}</p>
                    <p className="text-gray-500">{a.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {timeAgo(a.createdAt, d.timeAgo)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <AddTrackerForm disabled={atLimit} dict={dict.form} />
    </div>
  );
}
