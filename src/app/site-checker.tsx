"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publicCheck, type PublicCheckResult } from "@/app/actions/public-check";
import type { HealthItem, Level, Grade } from "@/lib/health-report";
import type { Dict } from "@/lib/i18n";
import { PENDING_SITE_KEY } from "@/lib/sites";

type C = Dict["checker"];

const LEVEL_DOT: Record<Level, string> = {
  good: "bg-up",
  warn: "bg-warn",
  bad: "bg-down",
  unknown: "bg-idle",
};

const GRADE_STYLE: Record<Grade, string> = {
  A: "bg-up-soft text-up ring-up/30",
  B: "bg-warn-soft text-warn ring-warn/30",
  C: "bg-warn-soft text-warn ring-warn/30",
  F: "bg-down-soft text-down ring-down/30",
};

/** Название пункта и значение — словами из словаря, числа подставляем здесь. */
function describe(item: HealthItem, c: C): [string, string] {
  switch (item.key) {
    case "online":
      return [c.online, item.level === "good" ? `${c.onlineGood} · ${item.ms} ${c.ms}` : c.onlineBad];
    case "speed":
      return [c.speed, `${item.ms} ${c.ms}`];
    case "ssl":
      if (item.days != null) return [c.ssl, item.days <= 0 ? c.sslExpired : `${c.sslDays} ${item.days} ${c.days}`];
      return [c.ssl, item.error === "noHttps" ? c.sslNone : c.sslBad];
    case "domain":
      if (item.days != null)
        return [c.domain, item.days <= 0 ? c.domainExpired : `${c.domainDays} ${item.days} ${c.days}`];
      return [c.domain, c.domainUnknown];
  }
}

export default function SiteChecker({ c }: { c: C }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [result, setResult] = useState<PublicCheckResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  function run(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setFailed(false);
    start(async () => {
      try {
        setResult(await publicCheck(value));
      } catch {
        setResult(null);
        setFailed(true);
      }
    });
  }

  function watch(host: string) {
    try {
      localStorage.setItem(PENDING_SITE_KEY, host);
    } catch {}
    router.push("/signup");
  }

  const error =
    failed
      ? c.errUnknown
      : result && !result.ok
        ? { invalid: c.errInvalid, rate: c.errRate, blocked: c.errBlocked }[result.error]
        : null;

  return (
    <div className="mx-auto w-full max-w-xl">
      <form onSubmit={run} className="flex gap-2 rounded-2xl border border-line bg-card p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder={c.placeholder}
          aria-label={c.placeholder}
          className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-12 shrink-0 rounded-xl bg-ink px-5 font-medium text-canvas transition hover:opacity-85 active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? c.checking : c.button}
        </button>
      </form>

      <div aria-live="polite">
        {error && <p className="mt-3 text-sm text-down">{error}</p>}

        {pending && (
          <div className="mt-4 space-y-2 rounded-2xl border border-line bg-card p-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-5 animate-pulse rounded bg-sunken" style={{ width: `${85 - i * 12}%` }} />
            ))}
          </div>
        )}

        {!pending && result?.ok && (
          <div className="rise mt-4 overflow-hidden rounded-2xl border border-line bg-card text-left">
            <div className="flex items-center gap-4 border-b border-line p-5">
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl font-bold ring-1 ${GRADE_STYLE[result.grade]}`}
                aria-label={`${c.grade} ${result.grade}`}
              >
                {result.grade}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-tight">{result.host}</p>
                <p className="text-sm text-mute">
                  {{ A: c.verdictA, B: c.verdictB, C: c.verdictC, F: c.verdictF }[result.grade]}
                </p>
              </div>
            </div>
            <ul className="divide-y divide-line">
              {result.items.map((item) => {
                const [label, val] = describe(item, c);
                return (
                  <li key={item.key} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <span className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full ${LEVEL_DOT[item.level]}`} />
                      {label}
                    </span>
                    <span className="text-right tabular-nums text-mute">{val}</span>
                  </li>
                );
              })}
            </ul>
            <div className="bg-sunken p-4">
              <button
                type="button"
                onClick={() => watch(result.host)}
                className="w-full rounded-xl bg-accent px-5 py-3 font-medium text-accent-ink transition hover:brightness-110 active:scale-[0.99]"
              >
                {c.watchCta} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
