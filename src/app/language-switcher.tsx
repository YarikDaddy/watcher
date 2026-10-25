"use client";

import { useOptimistic, useTransition } from "react";
import type { Locale } from "@/lib/i18n";
import { setLocale } from "@/app/actions/locale";

/**
 * Переключатель RU/EN. Кнопка переключается мгновенно (optimistic), а пока
 * сервер присылает страницу на новом языке — экран мягко «дышит»: лёгкий блюр
 * и бегущая полоска сверху. Анимация появляется с задержкой, поэтому быстрые
 * переключения проходят без мигания.
 */
export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(locale);

  function set(next: Locale) {
    if (next === shown) return;
    start(async () => {
      setShown(next);
      await setLocale(next);
    });
  }

  return (
    <>
      <div className="relative flex items-center rounded-full bg-sunken p-0.5 text-xs" aria-label="Language">
        <span
          aria-hidden
          className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-card shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ transform: shown === "en" ? "translateX(100%)" : "translateX(0)" }}
        />
        {(["ru", "en"] as Locale[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => set(l)}
            aria-pressed={shown === l}
            className={`relative z-10 w-9 rounded-full py-1 font-medium transition-colors ${
              shown === l ? "text-ink" : "text-faint hover:text-mute"
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      {pending && (
        <div aria-hidden className="locale-veil pointer-events-none fixed inset-0 z-[100]">
          <div className="locale-bar absolute inset-x-0 top-0 h-[3px]" />
        </div>
      )}
    </>
  );
}
