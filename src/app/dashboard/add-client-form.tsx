"use client";

import { useActionState, useEffect, useRef } from "react";
import { createClient } from "@/app/actions/clients";
import type { Dict } from "@/lib/i18n";

export default function AddClientForm({ dict }: { dict: Dict["clients"] }) {
  const [state, action, pending] = useActionState(createClient, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="name"
          placeholder={dict.addPlaceholder}
          className="flex-1 rounded-lg border border-line bg-sunken px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
        >
          {pending ? dict.adding : dict.add}
        </button>
      </div>
      {state?.error && <p className="text-sm text-down">{state.error}</p>}
    </form>
  );
}
