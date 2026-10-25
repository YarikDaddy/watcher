"use client";

import { useState } from "react";

/** Ссылка на статус-страницу + «Скопировать»: агентство шлёт её клиенту. */
export default function CopyLink({
  url,
  copyLabel,
  copiedLabel,
}: {
  url: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="truncate font-medium text-accent hover:underline"
      >
        {url.replace(/^https?:\/\//, "")}
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // нет доступа к буферу — ссылку можно скопировать вручную
          }
        }}
        className="shrink-0 rounded-md border border-line px-2 py-0.5 text-xs text-mute transition hover:bg-sunken"
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </span>
  );
}
