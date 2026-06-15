"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTracker } from "@/app/actions/trackers";

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <>
      {errors.map((e) => (
        <p key={e} className="mt-1 text-sm text-red-500">
          {e}
        </p>
      ))}
    </>
  );
}

export default function AddTrackerForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(createTracker, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Очищаем форму после успешного добавления
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  if (disabled) {
    return (
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/40">
        Достигнут лимит свободного тарифа. Удалите трекер, чтобы добавить новый.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
    >
      <h2 className="font-medium">Новый трекер</h2>

      <div>
        <input name="name" placeholder="Название (напр. Цена на iPhone)" className={inputClass} />
        <FieldError errors={state?.errors?.name} />
      </div>

      <div>
        <input name="url" placeholder="https://example.com/product" className={inputClass} />
        <FieldError errors={state?.errors?.url} />
      </div>

      <div>
        <input
          name="selector"
          placeholder="CSS-селектор (напр. .price, #stock)"
          className={inputClass}
        />
        <FieldError errors={state?.errors?.selector} />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-sm text-gray-500">Что отслеживать</label>
          <select name="type" defaultValue="TEXT_CHANGE" className={inputClass}>
            <option value="TEXT_CHANGE">Изменение текста</option>
            <option value="PRESENCE">Появление/исчезновение</option>
          </select>
          <FieldError errors={state?.errors?.type} />
        </div>

        <div className="flex-1">
          <label className="mb-1 block text-sm text-gray-500">Проверять раз в</label>
          <select name="intervalMinutes" defaultValue="60" className={inputClass}>
            <option value="60">1 час</option>
            <option value="180">3 часа</option>
            <option value="360">6 часов</option>
            <option value="720">12 часов</option>
            <option value="1440">сутки</option>
          </select>
          <FieldError errors={state?.errors?.intervalMinutes} />
        </div>
      </div>

      {state?.message && <p className="text-sm text-red-500">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Добавляю..." : "Добавить трекер"}
      </button>
    </form>
  );
}
