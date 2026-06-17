"use client";

import { useState, useTransition } from "react";
import { generateTelegramLink, unlinkTelegram } from "@/app/actions/telegram";
import type { Dict } from "@/lib/i18n";

export default function TelegramLink({
  linked,
  dict,
}: {
  linked: boolean;
  dict: Dict["telegram"];
}) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function connect() {
    startTransition(async () => {
      setError(null);
      const res = await generateTelegramLink();
      if ("deepLink" in res) {
        setLink(res.deepLink);
        window.open(res.deepLink, "_blank", "noopener,noreferrer");
      } else {
        setError(res.message);
      }
    });
  }

  if (linked) {
    return (
      <div className="mt-2 flex items-center gap-3">
        <span className="text-sm text-green-600">{dict.linked}</span>
        <form action={unlinkTelegram}>
          <button
            type="submit"
            className="text-xs text-gray-500 underline hover:text-red-500"
          >
            {dict.unlink}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <button
        onClick={connect}
        disabled={pending}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? dict.preparing : dict.connect}
      </button>
      {link && (
        <p className="mt-2 text-sm text-gray-500">
          {dict.instructions}{" "}
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {dict.openLink}
          </a>
          {dict.afterLink}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
