// Отчёт бесплатной проверки сайта на лендинге: четыре пункта + итоговая
// оценка. Чистые функции — тексты подставляет клиент по словарю `checker`.

export type Level = "good" | "warn" | "bad" | "unknown";

export type HealthItem =
  | { key: "online"; level: Level; ms?: number; error?: string }
  | { key: "speed"; level: Level; ms?: number }
  | { key: "ssl"; level: Level; days?: number; error?: string }
  | { key: "domain"; level: Level; days?: number; error?: string };

export type Grade = "A" | "B" | "C" | "F";

export function speedLevel(ms: number): Level {
  if (ms < 800) return "good";
  if (ms < 2000) return "warn";
  return "bad";
}

export function sslLevel(days: number): Level {
  if (days > 30) return "good";
  if (days > 7) return "warn";
  return "bad";
}

export function domainLevel(days: number): Level {
  if (days > 60) return "good";
  if (days > 14) return "warn";
  return "bad";
}

/** A — всё хорошо; B — одно замечание; C — несколько; F — есть критичное. */
export function gradeOf(items: HealthItem[]): Grade {
  if (items.some((i) => i.level === "bad")) return "F";
  const warns = items.filter((i) => i.level === "warn").length;
  if (warns === 0) return "A";
  return warns === 1 ? "B" : "C";
}
