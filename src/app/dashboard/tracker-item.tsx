"use client";

import { useState, useTransition } from "react";
import { deleteTracker, toggleTracker, updateTracker } from "@/app/actions/trackers";
import { assetLabel, assetUnit } from "@/lib/assets";
import type { TrackerFormState } from "@/lib/validation";
import type { Dict } from "@/lib/i18n";

export type TrackerView = {
  id: string;
  name: string;
  mode: "PRICE" | "SELECTOR" | "ASSET";
  url: string | null;
  selector: string | null;
  type: "TEXT_CHANGE" | "PRESENCE";
  asset: string | null;
  assetCondition: "ABOVE" | "BELOW" | "PERCENT" | null;
  threshold: number | null;
  intervalMinutes: number;
  status: string;
  lastValue: string | null;
  isActive: boolean;
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "text-gray-500",
  OK: "text-green-600",
  CHANGED: "text-blue-600 font-medium",
  ERROR: "text-red-500",
};

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900";

const INTERVALS = ["1", "5", "60", "180", "360", "720", "1440"] as const;

function intervalLabel(minutes: number, d: Dict["dashboard"]): string {
  if (minutes < 60) return `${minutes} ${d.minShort}`;
  const hours = minutes / 60;
  if (hours === 24) return d.dayShort;
  return `${hours} ${d.hourShort}`;
}

function conditionText(condition: string | null, threshold: number | null, unit: string): string {
  const u = unit ? ` ${unit}` : "";
  if (condition === "ABOVE") return `${threshold}${u} ↑`;
  if (condition === "BELOW") return `${threshold}${u} ↓`;
  if (condition === "PERCENT") return `±${threshold}%`;
  return "";
}

export default function TrackerItem({
  t,
  d,
  form,
}: {
  t: TrackerView;
  d: Dict["dashboard"];
  form: Dict["form"];
}) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<TrackerFormState>(undefined);
  const [pending, start] = useTransition();
  const [condition, setCondition] = useState(t.assetCondition ?? "BELOW");

  function submit(formData: FormData) {
    start(async () => {
      const res = await updateTracker(undefined, formData);
      setState(res);
      if (res?.success) setEditing(false);
    });
  }

  const err = state?.errors;

  const unit = assetUnit(t.asset ?? "");
  const statusClass = t.isActive ? STATUS_CLASS[t.status] ?? STATUS_CLASS.PENDING : "text-amber-600";
  const statusText = t.isActive
    ? d.statuses[t.status as keyof typeof d.statuses] ?? d.statuses.PENDING
    : d.paused;

  return (
    <li className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-medium">{t.name}</p>
          {t.mode === "ASSET" ? (
            <p className="truncate text-sm text-gray-500">
              📈 {assetLabel(t.asset ?? "")}
              {t.lastValue ? ` · ${d.nowPrefix} ${t.lastValue}${unit ? ` ${unit}` : ""}` : ""}
            </p>
          ) : (
            t.url && (
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm text-blue-600 hover:underline"
              >
                {t.url}
              </a>
            )
          )}
          <p className="mt-1 text-xs text-gray-500">
            {t.mode === "ASSET" ? (
              <>
                {d.alertPrefix} {conditionText(t.assetCondition, t.threshold, unit)}
              </>
            ) : t.mode === "PRICE" ? (
              <>{d.priceLabel}</>
            ) : (
              <code>{t.selector}</code>
            )}{" "}
            · {d.every} {intervalLabel(t.intervalMinutes, d)} ·{" "}
            <span className={statusClass}>{statusText}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {d.edit}
          </button>
          <form action={toggleTracker}>
            <input type="hidden" name="id" value={t.id} />
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {t.isActive ? d.pause : d.resume}
            </button>
          </form>
          <form action={deleteTracker}>
            <input type="hidden" name="id" value={t.id} />
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-950/40"
            >
              {d.delete}
            </button>
          </form>
        </div>
      </div>

      {editing && (
        <form action={submit} className="mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
          <input type="hidden" name="id" value={t.id} />

          {t.mode === "ASSET" && (
            <div className="flex gap-2">
              <select
                name="assetCondition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as typeof condition)}
                className={inputClass}
              >
                <option value="BELOW">{form.condBelow}</option>
                <option value="ABOVE">{form.condAbove}</option>
                <option value="PERCENT">{form.condPercent}</option>
              </select>
              <input
                name="threshold"
                type="number"
                step="any"
                defaultValue={t.threshold ?? undefined}
                placeholder={condition === "PERCENT" ? form.thresholdPercentPh : form.thresholdPricePh}
                className={inputClass}
              />
            </div>
          )}

          {(t.mode === "PRICE" || t.mode === "SELECTOR") && (
            <input name="url" defaultValue={t.url ?? ""} placeholder={form.urlPlaceholder} className={inputClass} />
          )}
          {t.mode === "SELECTOR" && (
            <>
              <input
                name="selector"
                defaultValue={t.selector ?? ""}
                placeholder={form.selectorPlaceholder}
                className={inputClass}
              />
              <select name="type" defaultValue={t.type} className={inputClass}>
                <option value="TEXT_CHANGE">{form.typeText}</option>
                <option value="PRESENCE">{form.typePresence}</option>
              </select>
            </>
          )}

          <input name="name" defaultValue={t.name} placeholder={form.namePlaceholder} className={inputClass} />

          <select name="intervalMinutes" defaultValue={String(t.intervalMinutes)} className={inputClass}>
            {INTERVALS.map((v) => (
              <option key={v} value={v}>
                {form.intervals[v]}
              </option>
            ))}
          </select>

          {[
            ...(err?.url ?? []),
            ...(err?.selector ?? []),
            ...(err?.threshold ?? []),
            ...(err?.assetCondition ?? []),
            ...(err?.intervalMinutes ?? []),
            ...(state?.message ? [state.message] : []),
          ].map((m) => (
            <p key={m} className="text-sm text-red-500">
              {m}
            </p>
          ))}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? d.saving : d.save}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {d.cancel}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
