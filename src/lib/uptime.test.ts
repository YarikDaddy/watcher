import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evalUptime,
  isUpStatus,
  formatDuration,
  formatPercent,
  uptimePercent,
  buildDayBars,
  utcDay,
  CONFIRM_FAILURES,
} from "./uptime";
import { getDict } from "./i18n";

const t0 = new Date("2026-10-25T12:00:00Z");
const later = (min: number) => new Date(t0.getTime() + min * 60_000);
const fresh = { lastValue: null, failCount: 0, downSince: null };

test("isUpStatus: 5xx/404/410 — лежит, 401/403/429 — сервер жив", () => {
  assert.equal(isUpStatus(200), true);
  assert.equal(isUpStatus(301), true);
  assert.equal(isUpStatus(403), true);
  assert.equal(isUpStatus(429), true);
  assert.equal(isUpStatus(404), false);
  assert.equal(isUpStatus(410), false);
  assert.equal(isUpStatus(500), false);
  assert.equal(isUpStatus(503), false);
});

test("evalUptime: одиночная неудача — без алерта, но с быстрой перепроверкой", () => {
  const up = evalUptime(fresh, { up: true }, t0).next;
  const ev = evalUptime(up, { up: false }, later(5));
  assert.equal(ev.event, null);
  assert.equal(ev.recheckSoon, true);
  assert.equal(ev.next.lastValue, "up");
  assert.equal(ev.next.failCount, 1);
  assert.deepEqual(ev.next.downSince, later(5));
});

test("evalUptime: подтверждённый сбой → down, потом восстановление с длительностью", () => {
  let s = evalUptime(fresh, { up: true }, t0).next;
  s = evalUptime(s, { up: false }, later(5)).next;
  assert.equal(CONFIRM_FAILURES, 2);
  const down = evalUptime(s, { up: false }, later(6));
  assert.equal(down.event, "down");
  assert.equal(down.next.lastValue, "down");
  assert.equal(down.recheckSoon, false);
  // сбой продолжается — повторного алерта нет, начало сбоя сохраняется
  const still = evalUptime(down.next, { up: false }, later(11));
  assert.equal(still.event, null);
  assert.deepEqual(still.next.downSince, later(5));
  const rec = evalUptime(still.next, { up: true }, later(35));
  assert.equal(rec.event, "recovered");
  assert.equal(rec.downtimeMs, 30 * 60_000);
  assert.deepEqual(rec.next, { lastValue: "up", failCount: 0, downSince: null });
});

test("evalUptime: ложная тревога (неудача, затем успех) — без алертов", () => {
  let s = evalUptime(fresh, { up: true }, t0).next;
  s = evalUptime(s, { up: false }, later(5)).next;
  const ok = evalUptime(s, { up: true }, later(6));
  assert.equal(ok.event, null);
  assert.equal(ok.next.failCount, 0);
});

test("evalUptime: сайт лежит с первой же проверки — алерт после подтверждения", () => {
  const first = evalUptime(fresh, { up: false }, t0);
  assert.equal(first.event, null);
  const second = evalUptime(first.next, { up: false }, later(1));
  assert.equal(second.event, "down");
});

test("formatDuration RU/EN", () => {
  const ru = getDict("ru").alerts;
  const en = getDict("en").alerts;
  assert.equal(formatDuration(45_000, ru), "45 сек");
  assert.equal(formatDuration(12 * 60_000, ru), "12 мин");
  assert.equal(formatDuration(192 * 60_000, ru), "3 ч 12 мин");
  assert.equal(formatDuration(120 * 60_000, en), "2 h");
  assert.equal(formatDuration(26 * 3_600_000, en), "1 d 2 h");
});

test("formatPercent не округляет сбой до 100%", () => {
  assert.equal(formatPercent(100), "100%");
  assert.equal(formatPercent(99.999), "99.99%");
  assert.equal(formatPercent(99.5), "99.5%");
  assert.equal(formatPercent(null), "—");
});

test("uptimePercent и buildDayBars", () => {
  assert.equal(uptimePercent([]), null);
  assert.equal(uptimePercent([{ checks: 10, up: 9 }, { checks: 10, up: 10 }]), 95);
  const today = new Date("2026-10-25T18:00:00Z");
  const bars = buildDayBars(
    [{ day: new Date("2026-10-24T00:00:00Z"), checks: 4, up: 3 }],
    3,
    today
  );
  assert.equal(bars.length, 3);
  assert.deepEqual(bars.map((b) => b.ratio), [null, 0.75, null]);
  assert.deepEqual(bars[2].day, utcDay(today));
});
