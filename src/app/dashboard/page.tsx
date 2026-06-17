import { getUser, getTrackers, getClients, getRecentAlerts } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { deleteClient } from "@/app/actions/clients";
import { FREE_TIER_TRACKER_LIMIT } from "@/lib/validation";
import { getLocale, getDict, type Dict } from "@/lib/i18n";
import AddTrackerForm from "./add-tracker-form";
import AddClientForm from "./add-client-form";
import TelegramLink from "./telegram-link";
import TrackerItem from "./tracker-item";
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

type TrackerRow = Awaited<ReturnType<typeof getTrackers>>[number];

export default async function DashboardPage() {
  const [user, trackers, clients, alerts, locale] = await Promise.all([
    getUser(),
    getTrackers(),
    getClients(),
    getRecentAlerts(),
    getLocale(),
  ]);
  const dict = getDict(locale);
  const d = dict.dashboard;
  const c = dict.clients;
  const atLimit = trackers.length >= FREE_TIER_TRACKER_LIMIT;

  // Группируем трекеры по клиенту: clientId → список; null — «без клиента».
  const grouped = new Map<string | null, TrackerRow[]>();
  for (const t of trackers) {
    const key = t.clientId ?? null;
    const arr = grouped.get(key);
    if (arr) arr.push(t);
    else grouped.set(key, [t]);
  }
  const unassigned = grouped.get(null) ?? [];

  const renderList = (list: TrackerRow[]) => (
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

      <section className="mb-8 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h2 className="mb-1 text-lg font-medium">{c.title}</h2>
        <p className="mb-3 text-sm text-gray-500">{c.intro}</p>
        <AddClientForm dict={c} />
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

        {trackers.length === 0 && clients.length === 0 ? (
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
          <div className="flex flex-col gap-6">
            {clients.map((client) => {
              const list = grouped.get(client.id) ?? [];
              return (
                <div key={client.id}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-medium">
                      {client.name}{" "}
                      <span className="text-sm font-normal text-gray-400">
                        · {list.length} {c.countSuffix}
                      </span>
                    </h3>
                    <form action={deleteClient}>
                      <input type="hidden" name="id" value={client.id} />
                      <button
                        type="submit"
                        title={c.deleteTitle}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-950/40"
                      >
                        {c.delete}
                      </button>
                    </form>
                  </div>
                  {list.length > 0 ? (
                    renderList(list)
                  ) : (
                    <p className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-500 dark:border-gray-700">
                      {c.noTrackers}
                    </p>
                  )}
                </div>
              );
            })}

            {unassigned.length > 0 && (
              <div>
                {clients.length > 0 && (
                  <h3 className="mb-2 font-medium text-gray-500">
                    {c.unassigned}{" "}
                    <span className="text-sm font-normal text-gray-400">
                      · {unassigned.length} {c.countSuffix}
                    </span>
                  </h3>
                )}
                {renderList(unassigned)}
              </div>
            )}
          </div>
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
                    {timeAgo(a.createdAt, dict.timeAgo)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <AddTrackerForm disabled={atLimit} dict={dict.form} clients={clients} clientsDict={c} />
    </div>
  );
}
