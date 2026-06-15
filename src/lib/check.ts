import * as cheerio from "cheerio";

export type CheckResult =
  | { ok: true; value: string; present: boolean }
  | { ok: false; error: string };

/**
 * Загружает страницу и извлекает значение по CSS-селектору.
 * MVP: только статичный HTML (без JS-рендеринга).
 */
export async function fetchValue(
  url: string,
  selector: string,
  timeoutMs = 15000
): Promise<CheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Часть сайтов отдаёт пустоту без User-Agent
        "User-Agent":
          "Mozilla/5.0 (compatible; WatcherBot/1.0; +https://github.com/watcher)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const el = $(selector).first();
    const present = el.length > 0;
    const value = present ? el.text().replace(/\s+/g, " ").trim() : "";

    return { ok: true, value, present };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Таймаут запроса"
          : err.message
        : "Неизвестная ошибка";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export type Comparison = {
  changed: boolean;
  message: string;
};

/**
 * Сравнивает новое значение с предыдущим в зависимости от типа трекера.
 * type: "TEXT_CHANGE" — изменился ли текст; "PRESENCE" — изменилось ли наличие.
 */
export function compare(
  type: "TEXT_CHANGE" | "PRESENCE",
  previous: string | null,
  current: { value: string; present: boolean }
): Comparison {
  if (type === "PRESENCE") {
    const prevPresent = previous === "present";
    if (previous === null) return { changed: false, message: "" };
    if (prevPresent !== current.present) {
      return {
        changed: true,
        message: current.present
          ? "Элемент появился на странице"
          : "Элемент исчез со страницы",
      };
    }
    return { changed: false, message: "" };
  }

  // TEXT_CHANGE
  if (previous === null) return { changed: false, message: "" };
  if (previous !== current.value) {
    return {
      changed: true,
      message: `Значение изменилось: «${previous}» → «${current.value}»`,
    };
  }
  return { changed: false, message: "" };
}

/** Нормализованное значение для хранения как "последнее". */
export function toStoredValue(
  type: "TEXT_CHANGE" | "PRESENCE",
  result: { value: string; present: boolean }
): string {
  return type === "PRESENCE" ? (result.present ? "present" : "absent") : result.value;
}
