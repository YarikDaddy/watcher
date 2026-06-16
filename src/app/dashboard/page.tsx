import { getUser, getTrackers } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { deleteTracker } from "@/app/actions/trackers";
import { FREE_TIER_TRACKER_LIMIT } from "@/lib/validation";
import AddTrackerForm from "./add-tracker-form";
import TelegramLink from "./telegram-link";

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
          <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700">
            Пока нет трекеров. Добавьте первый ниже.
          </p>
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
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm text-blue-600 hover:underline"
                    >
                      {t.url}
                    </a>
                    <p className="mt-1 text-xs text-gray-500">
                      <code>{t.selector}</code> · раз в {intervalLabel(t.intervalMinutes)} ·{" "}
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
