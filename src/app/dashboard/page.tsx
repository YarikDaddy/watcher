import { getUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";

export default async function DashboardPage() {
  // verifySession внутри getUser редиректит на /login, если сессии нет
  const user = await getUser();

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
        <p className="mt-2 text-sm text-gray-500">
          Telegram:{" "}
          {user?.telegramChatId ? (
            <span className="text-green-600">привязан</span>
          ) : (
            <span className="text-amber-600">не привязан</span>
          )}
        </p>
      </section>

      <section className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700">
        <p className="font-medium">Здесь будут ваши трекеры</p>
        <p className="mt-1 text-sm">
          Добавление и список трекеров появятся на следующем шаге (День 3).
        </p>
      </section>
    </div>
  );
}
