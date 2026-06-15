import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Watcher</h1>
      <p className="mt-4 text-lg text-gray-500">
        Следи за изменениями на любом сайте и получай мгновенные уведомления в
        Telegram. Упала цена, появился товар, вышла вакансия — узнаёшь первым.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          Начать бесплатно
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-gray-300 px-5 py-2.5 font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Войти
        </Link>
      </div>
    </main>
  );
}
