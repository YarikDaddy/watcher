"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createTracker } from "@/app/actions/trackers";
import { previewTracker, type PreviewResult } from "@/app/actions/preview";

type Mode = "PRICE" | "SELECTOR";

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

function PreviewBadge({ result, mode }: { result: PreviewResult; mode: Mode }) {
  const noun = mode === "PRICE" ? "цена" : "значение";
  if (!result.ok) {
    return <span className="text-sm text-red-500">✗ {result.error}</span>;
  }
  if (!result.present) {
    return (
      <span className="text-sm text-amber-600">
        ⚠{" "}
        {mode === "PRICE"
          ? "Цену найти не удалось — попробуйте режим «Свой селектор»"
          : "Селектор ничего не нашёл на странице — проверьте его"}
      </span>
    );
  }
  const value =
    result.value.length > 80 ? `${result.value.slice(0, 80)}…` : result.value;
  return (
    <span className="text-sm text-green-600">
      ✓ Нашлась {noun}: «{value || "пусто"}»
    </span>
  );
}

export default function AddTrackerForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(createTracker, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const selectorRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("PRICE");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewPending, startPreview] = useTransition();

  // Очищаем поля формы после успешного добавления
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  // Устаревший результат проверки больше не релевантен, если поля поменяли
  function clearPreview() {
    if (preview) setPreview(null);
  }

  function selectMode(next: Mode) {
    setMode(next);
    setPreview(null);
  }

  function handlePreview() {
    setPreview(null);
    startPreview(async () => {
      const res = await previewTracker(
        urlRef.current?.value ?? "",
        mode,
        selectorRef.current?.value ?? ""
      );
      setPreview(res);
    });
  }

  if (disabled) {
    return (
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/40">
        Достигнут лимит свободного тарифа. Удалите трекер, чтобы добавить новый.
      </p>
    );
  }

  const modeButton = (value: Mode, label: string) => (
    <button
      type="button"
      onClick={() => selectMode(value)}
      className={`flex-1 rounded-md border px-3 py-2 text-sm transition ${
        mode === value
          ? "border-blue-600 bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
          : "border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={clearPreview}
      className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
    >
      <h2 className="font-medium">Новый трекер</h2>

      <input type="hidden" name="mode" value={mode} />

      <div>
        <label className="mb-1 block text-sm text-gray-500">Что отслеживать</label>
        <div className="flex gap-2">
          {modeButton("PRICE", "💰 Цена — найду сам")}
          {modeButton("SELECTOR", "⚙️ Свой селектор")}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {mode === "PRICE"
            ? "Просто вставьте ссылку на товар — Watcher сам найдёт цену и сообщит, когда она изменится."
            : "Для продвинутых: задайте CSS-селектор любого элемента на странице."}
        </p>
      </div>

      <div>
        <input
          name="url"
          ref={urlRef}
          onChange={clearPreview}
          placeholder="https://example.com/product"
          className={inputClass}
        />
        <FieldError errors={state?.errors?.url} />
      </div>

      {mode === "SELECTOR" && (
        <div>
          <input
            name="selector"
            ref={selectorRef}
            onChange={clearPreview}
            placeholder="CSS-селектор (напр. .price, #stock)"
            className={inputClass}
          />
          <FieldError errors={state?.errors?.selector} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewPending}
          className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {previewPending ? "Проверяю..." : "Проверить"}
        </button>
        {preview && <PreviewBadge result={preview} mode={mode} />}
      </div>

      <div>
        <input
          name="name"
          placeholder="Название (необязательно — подставим домен)"
          className={inputClass}
        />
        <FieldError errors={state?.errors?.name} />
      </div>

      <div className="flex gap-3">
        {mode === "SELECTOR" && (
          <div className="flex-1">
            <label className="mb-1 block text-sm text-gray-500">Тип изменения</label>
            <select name="type" defaultValue="TEXT_CHANGE" className={inputClass}>
              <option value="TEXT_CHANGE">Изменение текста</option>
              <option value="PRESENCE">Появление/исчезновение</option>
            </select>
            <FieldError errors={state?.errors?.type} />
          </div>
        )}

        <div className="flex-1">
          <label className="mb-1 block text-sm text-gray-500">Проверять раз в</label>
          <select name="intervalMinutes" defaultValue="60" className={inputClass}>
            <option value="1">1 минута</option>
            <option value="5">5 минут</option>
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
