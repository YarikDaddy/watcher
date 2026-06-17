import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientByShareToken } from "@/lib/dal";
import { getLocale, getDict, type Dict } from "@/lib/i18n";

type Params = { params: Promise<{ token: string }> };

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

type Health = { label: string; dot: string; text: string };

function health(status: string, sp: Dict["statusPage"]): Health {
  switch (status) {
    case "OK":
      return { label: sp.operational, dot: "bg-green-500", text: "text-green-600" };
    case "CHANGED":
      return { label: sp.attention, dot: "bg-amber-500", text: "text-amber-600" };
    case "ERROR":
      return { label: sp.problem, dot: "bg-red-500", text: "text-red-600" };
    default:
      return { label: sp.checking, dot: "bg-gray-400", text: "text-gray-500" };
  }
}

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

  // Публично показываем только активные трекеры.
  const items = client.trackers.filter((t) => t.isActive);
  const hasProblem = items.some((t) => t.status === "ERROR");
  const hasAttention = items.some((t) => t.status === "CHANGED");
  const allOk = items.length > 0 && !hasProblem && !hasAttention;

  const lastChecked = items
    .map((t) => t.lastCheckedAt)
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-400">{brand}</p>
          <h1 className="mt-1 text-2xl font-semibold">
            {client.name} · {sp.title}
          </h1>
        </header>

        <div
          className={`mb-6 flex items-center gap-3 rounded-lg border p-4 ${
            hasProblem
              ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
              : hasAttention
                ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
                : "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
          }`}
        >
          <span
            className={`h-3 w-3 shrink-0 rounded-full ${
              hasProblem ? "bg-red-500" : hasAttention ? "bg-amber-500" : "bg-green-500"
            }`}
          />
          <p className="font-medium">{allOk || items.length === 0 ? sp.allOk : sp.hasIssues}</p>
        </div>

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
            {sp.empty}
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
            {items.map((t) => {
              const h = health(t.status, sp);
              const days = t.mode === "CERT" && t.lastValue != null ? Number(t.lastValue) : NaN;
              const certDetail = Number.isNaN(days)
                ? ""
                : days <= 0
                  ? sp.sslExpired
                  : `${sp.sslExpiresIn} ${days} ${sp.daysShort}`;
              return (
                <li key={t.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${h.dot}`} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.name}</p>
                      {certDetail && <p className="truncate text-xs text-gray-500">{certDetail}</p>}
                    </div>
                  </div>
                  <span className={`shrink-0 text-sm font-medium ${h.text}`}>{h.label}</span>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="mt-8 flex items-center justify-between text-xs text-gray-400">
          <span>
            {sp.updated} {timeAgo(lastChecked, dict.timeAgo, sp.neverChecked)}
          </span>
          <span>
            {sp.poweredBy}{" "}
            <Link href="/" className="font-medium hover:underline">
              Watcher
            </Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
