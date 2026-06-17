"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createTracker } from "@/app/actions/trackers";
import { previewTracker, type PreviewResult } from "@/app/actions/preview";
import { ASSETS } from "@/lib/assets";
import type { Dict } from "@/lib/i18n";

type Mode = "PRICE" | "ASSET" | "SELECTOR";
type Condition = "ABOVE" | "BELOW" | "PERCENT";
type FormDict = Dict["form"];

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

function PreviewBadge({
  result,
  mode,
  dict,
}: {
  result: PreviewResult;
  mode: Mode;
  dict: FormDict;
}) {
  if (!result.ok) {
    return <span className="text-sm text-red-500">✗ {result.error}</span>;
  }
  if (!result.present) {
    return (
      <span className="text-sm text-amber-600">
        ⚠ {mode === "PRICE" ? dict.previewNotFoundPrice : dict.previewNotFoundSelector}
      </span>
    );
  }
  const value =
    result.value.length > 80 ? `${result.value.slice(0, 80)}…` : result.value;
  return (
    <span className="text-sm text-green-600">
      ✓ {mode === "ASSET" ? dict.previewFoundAsset : dict.previewFound}: «
      {value || dict.previewEmpty}»
    </span>
  );
}

export default function AddTrackerForm({
  disabled,
  dict,
}: {
  disabled: boolean;
  dict: FormDict;
}) {
  const [state, action, pending] = useActionState(createTracker, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const selectorRef = useRef<HTMLInputElement>(null);
  const assetRef = useRef<HTMLSelectElement>(null);
  const [mode, setMode] = useState<Mode>("PRICE");
  const [condition, setCondition] = useState<Condition>("BELOW");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewPending, startPreview] = useTransition();

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

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
      const res = await previewTracker({
        mode,
        url: urlRef.current?.value ?? "",
        selector: selectorRef.current?.value ?? "",
        asset: assetRef.current?.value ?? "",
      });
      setPreview(res);
    });
  }

  if (disabled) {
    return (
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/40">
        {dict.limitReached}
      </p>
    );
  }

  const modeButton = (value: Mode, label: string) => (
    <button
      type="button"
      onClick={() => selectMode(value)}
      className={`flex-1 rounded-md border px-2 py-2 text-sm transition ${
        mode === value
          ? "border-blue-600 bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
          : "border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
      }`}
    >
      {label}
    </button>
  );

  const hint =
    mode === "PRICE" ? dict.hintPrice : mode === "ASSET" ? dict.hintAsset : dict.hintSelector;

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={clearPreview}
      className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
    >
      <h2 className="font-medium">{dict.newTracker}</h2>

      <input type="hidden" name="mode" value={mode} />

      <div>
        <label className="mb-1 block text-sm text-gray-500">{dict.whatToTrack}</label>
        <div className="flex gap-2">
          {modeButton("PRICE", dict.modePrice)}
          {modeButton("ASSET", dict.modeAsset)}
          {modeButton("SELECTOR", dict.modeSelector)}
        </div>
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      </div>

      {mode === "ASSET" ? (
        <>
          <div>
            <label className="mb-1 block text-sm text-gray-500">{dict.asset}</label>
            <select name="asset" ref={assetRef} onChange={clearPreview} className={inputClass}>
              {ASSETS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
            <FieldError errors={state?.errors?.asset} />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-gray-500">{dict.condition}</label>
              <select
                name="assetCondition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as Condition)}
                className={inputClass}
              >
                <option value="BELOW">{dict.condBelow}</option>
                <option value="ABOVE">{dict.condAbove}</option>
                <option value="PERCENT">{dict.condPercent}</option>
              </select>
              <FieldError errors={state?.errors?.assetCondition} />
            </div>

            <div className="flex-1">
              <label className="mb-1 block text-sm text-gray-500">
                {condition === "PERCENT" ? dict.thresholdPercent : dict.thresholdPrice}
              </label>
              <input
                name="threshold"
                type="number"
                step="any"
                placeholder={
                  condition === "PERCENT" ? dict.thresholdPercentPh : dict.thresholdPricePh
                }
                className={inputClass}
              />
              <FieldError errors={state?.errors?.threshold} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <input
              name="url"
              ref={urlRef}
              onChange={clearPreview}
              placeholder={dict.urlPlaceholder}
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
                placeholder={dict.selectorPlaceholder}
                className={inputClass}
              />
              <FieldError errors={state?.errors?.selector} />
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewPending}
          className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {previewPending ? dict.checking : dict.check}
        </button>
        {preview && <PreviewBadge result={preview} mode={mode} dict={dict} />}
      </div>

      <div>
        <input name="name" placeholder={dict.namePlaceholder} className={inputClass} />
        <FieldError errors={state?.errors?.name} />
      </div>

      <div className="flex gap-3">
        {mode === "SELECTOR" && (
          <div className="flex-1">
            <label className="mb-1 block text-sm text-gray-500">{dict.typeLabel}</label>
            <select name="type" defaultValue="TEXT_CHANGE" className={inputClass}>
              <option value="TEXT_CHANGE">{dict.typeText}</option>
              <option value="PRESENCE">{dict.typePresence}</option>
            </select>
            <FieldError errors={state?.errors?.type} />
          </div>
        )}

        <div className="flex-1">
          <label className="mb-1 block text-sm text-gray-500">{dict.checkEvery}</label>
          <select name="intervalMinutes" defaultValue="60" className={inputClass}>
            {(["1", "5", "60", "180", "360", "720", "1440"] as const).map((v) => (
              <option key={v} value={v}>
                {dict.intervals[v]}
              </option>
            ))}
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
        {pending ? dict.adding : dict.addTracker}
      </button>
    </form>
  );
}
