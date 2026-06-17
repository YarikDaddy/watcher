import { test } from "node:test";
import assert from "node:assert/strict";
import { getDict } from "./i18n";

// Эти секции словаря передаются пропсами в client-компоненты, поэтому НЕ должны
// содержать функций: иначе server→client сериализация падает в рантайме, а
// `next build` это не ловит (см. баг 4b6500b: dict.dashboard.timeAgo).
const CLIENT_SECTIONS = ["form", "dashboard", "telegram", "auth"] as const;

function functionPaths(obj: unknown, path = ""): string[] {
  if (typeof obj === "function") return [path];
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.entries(obj).flatMap(([k, v]) =>
      functionPaths(v, path ? `${path}.${k}` : k)
    );
  }
  return [];
}

for (const loc of ["en", "ru"] as const) {
  for (const section of CLIENT_SECTIONS) {
    test(`i18n[${loc}].${section} сериализуемо для client-компонента (нет функций)`, () => {
      const fns = functionPaths(getDict(loc)[section], section);
      assert.deepEqual(fns, [], `Функции в клиентской секции: ${fns.join(", ")}`);
    });
  }
}
