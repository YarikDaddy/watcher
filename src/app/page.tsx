import Link from "next/link";
import { FREE_TIER_TRACKER_LIMIT } from "@/lib/validation";

const STEPS = [
  {
    n: "1",
    title: "Вставь ссылку",
    text: "Дай ссылку на товар — Watcher сам найдёт цену. Для остального есть продвинутый режим со своим селектором.",
  },
  {
    n: "2",
    title: "Привяжи Telegram",
    text: "Один клик — и бот Watcher подключён к твоему аккаунту. Никаких приложений ставить не нужно.",
  },
  {
    n: "3",
    title: "Получай алерты",
    text: "Watcher периодически проверяет страницу и пишет в Telegram в ту же секунду, как что-то изменилось.",
  },
];

const USE_CASES = [
  { icon: "💸", title: "Цены", text: "Лови скидку на товар или билет, как только цена упадёт." },
  { icon: "📦", title: "Наличие", text: "Узнавай первым, когда товар снова появился в наличии." },
  { icon: "💼", title: "Вакансии", text: "Следи за страницей карьеры — новая вакансия не пройдёт мимо." },
  { icon: "📄", title: "Любой текст", text: "Изменения в расписании, статусе заявки, условиях — что угодно." },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Шапка */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <span className="text-lg font-semibold">Watcher</span>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Войти
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Начать бесплатно
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-4 pb-16 pt-16 text-center sm:pt-24">
        <span className="inline-block rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 dark:border-gray-700">
          Мониторинг сайтов · уведомления в Telegram
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          Узнавай об изменениях на сайтах первым
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-gray-500">
          Watcher следит за нужной страницей и присылает мгновенный алерт в Telegram, когда
          меняется цена, появляется товар или выходит вакансия. Без ручного обновления F5.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Начать бесплатно
          </Link>
          <a
            href="#how"
            className="rounded-md border border-gray-300 px-6 py-3 font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Как это работает
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          Бесплатно: {FREE_TIER_TRACKER_LIMIT} трекера · без карты
        </p>
      </section>

      {/* Как это работает */}
      <section id="how" className="mx-auto w-full max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold">Как это работает</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
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
        <h2 className="text-center text-2xl font-semibold">Для чего используют</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((c) => (
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

      {/* Тариф */}
      <section className="mx-auto w-full max-w-md px-4 py-16">
        <h2 className="text-center text-2xl font-semibold">Простой старт</h2>
        <div className="mt-8 rounded-2xl border border-gray-200 p-8 text-center dark:border-gray-800">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
            Бесплатный тариф
          </p>
          <p className="mt-3 text-4xl font-bold">0 ₽</p>
          <ul className="mt-6 flex flex-col gap-2 text-sm text-gray-500">
            <li>✓ До {FREE_TIER_TRACKER_LIMIT} трекеров</li>
            <li>✓ Проверка раз в час</li>
            <li>✓ Уведомления в Telegram</li>
            <li>✓ История срабатываний</li>
          </ul>
          <Link
            href="/signup"
            className="mt-8 inline-block w-full rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Создать аккаунт
          </Link>
        </div>
      </section>

      {/* Футер */}
      <footer className="mt-auto border-t border-gray-200 py-8 dark:border-gray-800">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-4 text-sm text-gray-400 sm:flex-row">
          <span>© {new Date().getFullYear()} Watcher</span>
          <span>Сделано в открытую · #buildinpublic</span>
        </div>
      </footer>
    </div>
  );
}
