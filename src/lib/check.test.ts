import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, toStoredValue } from "./check";

test("TEXT_CHANGE: первая проверка не считается изменением", () => {
  const r = compare("TEXT_CHANGE", null, { value: "100 ₽", present: true });
  assert.equal(r.changed, false);
});

test("TEXT_CHANGE: одинаковое значение — нет изменения", () => {
  const r = compare("TEXT_CHANGE", "100 ₽", { value: "100 ₽", present: true });
  assert.equal(r.changed, false);
});

test("TEXT_CHANGE: другое значение — изменение", () => {
  const r = compare("TEXT_CHANGE", "100 ₽", { value: "90 ₽", present: true });
  assert.equal(r.changed, true);
  assert.match(r.message, /100 ₽.*90 ₽/);
});

test("PRESENCE: появление элемента — изменение", () => {
  const r = compare("PRESENCE", "absent", { value: "", present: true });
  assert.equal(r.changed, true);
  assert.match(r.message, /появил/);
});

test("PRESENCE: исчезновение элемента — изменение", () => {
  const r = compare("PRESENCE", "present", { value: "x", present: false });
  assert.equal(r.changed, true);
  assert.match(r.message, /исчез/);
});

test("PRESENCE: без изменений", () => {
  const r = compare("PRESENCE", "present", { value: "x", present: true });
  assert.equal(r.changed, false);
});

test("toStoredValue: PRESENCE кодирует наличие", () => {
  assert.equal(toStoredValue("PRESENCE", { value: "x", present: true }), "present");
  assert.equal(toStoredValue("PRESENCE", { value: "", present: false }), "absent");
});

test("toStoredValue: TEXT_CHANGE хранит само значение", () => {
  assert.equal(toStoredValue("TEXT_CHANGE", { value: "42", present: true }), "42");
});
