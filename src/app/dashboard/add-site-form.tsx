"use client";

import { useActionState, useEffect, useRef } from "react";
import { addSite } from "@/app/actions/sites";
import type { Dict } from "@/lib/i18n";
import { PENDING_SITE_KEY } from "@/lib/sites";

export default function AddSiteForm({
  dict,
  clients,
}: {
  dict: Dict["sites"];
  clients: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(addSite, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PENDING_SITE_KEY);
      if (saved && urlRef.current && !urlRef.current.value) {
        urlRef.current.value = saved;
        urlRef.current.focus();
      }
    } catch {
      // приватный режим / storage недоступен — просто пустое поле
    }
  }, []);

  useEffect(() => {
    if (!state?.success) return;
    formRef.current?.reset();
    try {
      localStorage.removeItem(PENDING_SITE_KEY);
    } catch {}
  }, [state]);

  return (
    <section className="rounded-3xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-7">
      <h2 className="text-xl font-semibold tracking-tight">{dict.addTitle}</h2>
      <p className="mt-1 max-w-xl text-sm text-mute">{dict.addSubtitle}</p>

      <form ref={formRef} action={action} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          ref={urlRef}
          name="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder={dict.urlPlaceholder}
          aria-label={dict.urlPlaceholder}
          className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-sunken px-4 text-base outline-none transition focus:border-accent focus:bg-card focus:ring-4 focus:ring-accent/15"
        />
        <input
          name="client"
          list="watcher-clients"
          autoComplete="off"
          placeholder={dict.clientPlaceholder}
          aria-label={dict.clientPlaceholder}
          defaultValue={clients[0]?.name ?? ""}
          className="h-12 min-w-0 rounded-xl border border-line bg-sunken px-4 text-sm outline-none transition focus:border-accent focus:bg-card focus:ring-4 focus:ring-accent/15 sm:w-48"
        />
        <datalist id="watcher-clients">
          {clients.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
        <button
          type="submit"
          disabled={pending}
          className="h-12 shrink-0 rounded-xl bg-accent px-6 font-medium text-accent-ink transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? dict.adding : dict.add}
        </button>
      </form>

      <div aria-live="polite" className="min-h-5">
        {state?.error && <p className="mt-2 text-sm text-down">{state.error}</p>}
        {state?.success && (
          <p className="mt-2 text-sm text-up">
            ✓ <span className="font-medium">{state.host}</span> {dict.added}
          </p>
        )}
      </div>
    </section>
  );
}
