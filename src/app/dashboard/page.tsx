import { getUser, getTrackers } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { deleteTracker } from "@/app/actions/trackers";
import { FREE_TIER_TRACKER_LIMIT } from "@/lib/validation";
import { assetLabel, assetUnit } from "@/lib/assets";
import AddTrackerForm from "./add-tracker-form";
import TelegramLink from "./telegram-link";

function assetConditionText(
  condition: string | null,
  threshold: number | null,
  unit: string
): string {
  const u = unit ? ` ${unit}` : "";
  if (condition === "ABOVE") return `выше ${threshold}${u}`;
  if (condition === "BELOW") return `ниже ${threshold}${u}`;
  if (condition === "PERCENT") return `±${threshold}%`;
  return "";
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  PENDING: { text: "ожидает проверки", className: "text-gray-500" },
  OK: { text: "без изменений", className: "text-green-600" },
  CHANGED: { text: "изменилось!", className: "text-blue-600 font-medium" },
  ERROR: { text: "ошибка", className: "text-red-500" },
};

function intervalLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const hours = minutes / 60;
  if (hours === 24) return "сутки";
  return `${hours} ч`;
}

export default async function DashboardPage() {
  const [user, trackers] = await Promise.all([getUser(), getTrackers()]);
  const atLimit = trackers.length >= FREE_TIER_TRACKER_LIMIT;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Watcher</h1>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Выйти
          </button>
        </form>
      </header>

      <section className="mb-8 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <p className="text-sm text-gray-500">Вы вошли как</p>
        <p className="font-medium">{user?.email}</p>
        <TelegramLink linked={!!user?.telegramChatId} />
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">
            Трекеры{" "}
            <span className="text-sm font-normal text-gray-500">
              {trackers.length} / {FREE_TIER_TRACKER_LIMIT}
            </span>
          </h2>
        </div>

        {trackers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 dark:border-gray-700">
            <p className="font-medium">Добавьте первый трекер за минуту 👇</p>
            <ol className="mt-3 flex flex-col gap-1.5 text-sm text-gray-500">
              <li>1. Вставьте ссылку на товар или страницу.</li>
              <li>2. Watcher сам найдёт цену — нажмите «Проверить», чтобы убедиться.</li>
              <li>3. Привяжите Telegram выше — и получайте алерт при изменении.</li>
            </ol>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {trackers.map((t) => {
              const status = STATUS_LABEL[t.status] ?? STATUS_LABEL.PENDING;
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
                          ? ` · сейчас ${t.lastValue}${assetUnit(t.asset ?? "") ? ` ${assetUnit(t.asset ?? "")}` : ""}`
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
                          алерт: {assetConditionText(t.assetCondition, t.threshold, assetUnit(t.asset ?? ""))}
                        </>
                      ) : t.mode === "PRICE" ? (
                        <>💰 цена</>
                      ) : (
                        <code>{t.selector}</code>
                      )}{" "}
                      · раз в {intervalLabel(t.intervalMinutes)} ·{" "}
                      <span className={status.className}>{status.text}</span>
                    </p>
                  </div>
                  <form action={deleteTracker}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-sm text-red-500 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-950/40"
                    >
                      Удалить
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AddTrackerForm disabled={atLimit} />
    </div>
  );
}
