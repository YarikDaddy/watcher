import Link from "next/link";
import { getLocale, getDict } from "@/lib/i18n";
import LanguageSwitcher from "./language-switcher";

const GITHUB_URL = "https://github.com/YarikDaddy/watcher";

export default async function Home() {
  const locale = await getLocale();
  const dict = getDict(locale);
  const t = dict.landing;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Шапка */}
      <header className="sticky top-0 z-10 border-b border-gray-200/70 bg-white/70 backdrop-blur dark:border-gray-800/70 dark:bg-black/40">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3.5">
          <span className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-sm text-white">
              W
            </span>
            {dict.common.appName}
          </span>
          <nav className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher locale={locale} />
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {dict.common.login}
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {dict.common.startFree}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-72 max-w-3xl bg-blue-500/20 blur-3xl dark:bg-blue-500/10" />
        <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-16 text-center sm:pt-24">
          <span className="inline-block rounded-full border border-gray-200 bg-white/60 px-3 py-1 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/60">
            {t.badge}
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            {t.heroTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-gray-500">{t.heroSubtitle}</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-blue-700"
            >
              {t.ctaPrimary}
            </Link>
            <a
              href="#how"
              className="rounded-md border border-gray-300 px-6 py-3 font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {t.ctaSecondary}
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-400">{t.freeNote}</p>

          {/* Превью продукта: мокап дашборда + Telegram-алерт */}
          <div className="mx-auto mt-12 grid max-w-2xl gap-4 text-left sm:grid-cols-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:col-span-3">
              <p className="mb-3 text-sm font-medium text-gray-500">{t.preview.dashboardTitle}</p>
              <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <p className="font-medium">{t.preview.trackerName}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {t.preview.trackerMeta} ·{" "}
                  <span className="text-green-600">{t.preview.statusOk}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:col-span-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs text-white">
                  ✈
                </span>
                <span className="text-xs font-medium text-gray-500">{t.preview.botName}</span>
              </div>
              <div className="mt-2 rounded-2xl rounded-tl-sm bg-sky-50 p-3 text-sm dark:bg-sky-950/40">
                {t.preview.alertText}
                <span className="mt-1 block text-right text-[10px] text-gray-400">
                  {t.preview.alertTime}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Три столпа для студий */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold">{t.pillarsTitle}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {t.pillars.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
            >
              <span className="text-3xl">{p.icon}</span>
              <h3 className="mt-4 text-lg font-medium">{p.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Что можно отслеживать */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold">{t.modesTitle}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-gray-500">{t.modesSubtitle}</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.modes.map((m) => (
            <div
              key={m.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
            >
              <span className="text-3xl">{m.icon}</span>
              <h3 className="mt-4 text-lg font-medium">{m.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* White-label статус-страница клиента */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-8 dark:border-gray-800 dark:from-blue-950/30 dark:to-gray-950 sm:p-12">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">{t.statusTitle}</h2>
              <p className="mt-4 text-gray-500">{t.statusSubtitle}</p>
              <ul className="mt-6 flex flex-col gap-3">
                {t.statusPoints.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            {/* Мокап статус-страницы клиента */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {t.preview.dashboardTitle}
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/40">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-sm font-medium">{t.statusPagePreview}</span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {t.statusPageRows.map((row) => {
                  const tones: Record<string, { dot: string; text: string }> = {
                    ok: { dot: "bg-green-500", text: "text-green-600" },
                    warn: { dot: "bg-amber-500", text: "text-amber-600" },
                  };
                  const tone = tones[row.tone] ?? tones.ok;
                  return (
                    <div
                      key={row.name}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                        {row.name}
                      </span>
                      <span className={tone.text}>{row.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Как это работает */}
      <section id="how" className="mx-auto w-full max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold">{t.howTitle}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {t.steps.map((s) => (
            <div
              key={s.n}
              className="rounded-xl border border-gray-200 p-6 dark:border-gray-800"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                {s.n}
              </span>
              <h3 className="mt-4 font-medium">{s.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Кейсы */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold">{t.casesTitle}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.cases.map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-gray-200 p-6 dark:border-gray-800"
            >
              <span className="text-2xl">{c.icon}</span>
              <h3 className="mt-3 font-medium">{c.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ — доверие */}
      <section className="mx-auto w-full max-w-2xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold">{t.faqTitle}</h2>
        <div className="mt-8 flex flex-col gap-3">
          {t.faq.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <summary className="cursor-pointer list-none font-medium marker:content-none">
                <span className="flex items-center justify-between">
                  {item.q}
                  <span className="text-gray-400 transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm text-gray-500">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Тариф */}
      <section className="mx-auto w-full max-w-md px-4 py-16">
        <h2 className="text-center text-2xl font-semibold">{t.tariffTitle}</h2>
        <div className="mt-8 rounded-2xl border border-gray-200 p-8 text-center dark:border-gray-800">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
            {t.tariffName}
          </p>
          <p className="mt-3 text-4xl font-bold">{t.tariffPrice}</p>
          <ul className="mt-6 flex flex-col gap-2 text-sm text-gray-500">
            {t.tariffFeatures.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="mt-8 inline-block w-full rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            {t.tariffCta}
          </Link>
        </div>
      </section>

      {/* Футер */}
      <footer className="mt-auto border-t border-gray-200 py-8 dark:border-gray-800">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-4 text-sm text-gray-400 sm:flex-row">
          <span>© {new Date().getFullYear()} {dict.common.appName}</span>
          <div className="flex items-center gap-4">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 dark:hover:text-gray-300">
              GitHub
            </a>
            <span>{t.footerTagline}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
