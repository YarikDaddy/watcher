import type { DayBar } from "@/lib/uptime";
import type { SiteHealth } from "@/lib/sites";

/** Цвет дня по доле успешных проверок — как на статус-страницах крупных сервисов. */
function barColor(ratio: number | null): string {
  if (ratio == null) return "bg-idle";
  if (ratio >= 0.999) return "bg-up";
  if (ratio >= 0.98) return "bg-warn";
  return "bg-down";
}

/**
 * Полоса аптайма по дням (серверный компонент, без JS на клиенте).
 * Подсказка по наведению — нативный title: дата + процент.
 */
export function UptimeBars({
  bars,
  locale,
  noData,
  className = "h-8",
}: {
  bars: DayBar[];
  locale: string;
  noData: string;
  className?: string;
}) {
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <div className={`flex items-stretch gap-px overflow-hidden sm:gap-[2px] ${className}`} role="img" aria-label="uptime">
      {bars.map((b) => (
        <span
          key={b.day.getTime()}
          title={`${fmt.format(b.day)} · ${b.ratio == null ? noData : `${(Math.floor(b.ratio * 10000) / 100).toString()}%`}`}
          className={`min-w-0 flex-1 rounded-[1px] sm:rounded-[2px] transition-opacity hover:opacity-70 ${barColor(b.ratio)}`}
        />
      ))}
    </div>
  );
}

const DOT: Record<SiteHealth, string> = {
  up: "bg-up",
  down: "bg-down",
  warn: "bg-warn",
  pending: "bg-idle",
  paused: "bg-idle",
};

export function StatusDot({ health, size = "h-2.5 w-2.5" }: { health: SiteHealth; size?: string }) {
  const live = health === "up" || health === "down";
  return (
    <span className={`inline-block shrink-0 rounded-full ${size} ${DOT[health]} ${live ? "pulse-dot" : ""}`} />
  );
}
