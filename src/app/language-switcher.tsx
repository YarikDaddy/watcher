"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@/lib/i18n";
import { setLocale } from "@/app/actions/locale";

const LABELS: Record<Locale, string> = { ru: "RU", en: "EN" };

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function set(next: Locale) {
    if (next === locale) return;
    start(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 text-xs" aria-label="Language">
      {(["ru", "en"] as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          disabled={pending}
          className={`rounded px-1.5 py-0.5 transition ${
            locale === l
              ? "font-semibold text-blue-600"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
