import { test } from "node:test";
import assert from "node:assert/strict";
import { evalAssetAlert } from "./assets";

test("ABOVE: алерт в момент пересечения вверх", () => {
  const r = evalAssetAlert("ABOVE", 100, { lastPrice: 95, baseline: null }, 105);
  assert.equal(r.alert, true);
});

test("ABOVE: уже выше и остаётся выше — без алерта (без спама)", () => {
  const r = evalAssetAlert("ABOVE", 100, { lastPrice: 105, baseline: null }, 110);
  assert.equal(r.alert, false);
});

test("ABOVE: первая проверка, уже выше порога — алерт один раз", () => {
  const r = evalAssetAlert("ABOVE", 100, { lastPrice: null, baseline: null }, 105);
  assert.equal(r.alert, true);
});

test("BELOW: алерт при падении ниже порога", () => {
  const r = evalAssetAlert("BELOW", 60000, { lastPrice: 61000, baseline: null }, 59000);
  assert.equal(r.alert, true);
  assert.match(r.message, /ниже/);
});

test("BELOW: остаётся выше — без алерта", () => {
  const r = evalAssetAlert("BELOW", 60000, { lastPrice: 65000, baseline: null }, 64000);
  assert.equal(r.alert, false);
});

test("PERCENT: первая проверка задаёт baseline, без алерта", () => {
  const r = evalAssetAlert("PERCENT", 5, { lastPrice: null, baseline: null }, 100);
  assert.equal(r.alert, false);
  assert.equal(r.newBaseline, 100);
});

test("PERCENT: рост на >=5% — алерт и сброс baseline", () => {
  const r = evalAssetAlert("PERCENT", 5, { lastPrice: 100, baseline: 100 }, 106);
  assert.equal(r.alert, true);
  assert.match(r.message, /вырос/);
  assert.equal(r.newBaseline, 106);
});

test("PERCENT: маленькое движение — без алерта, baseline сохраняется", () => {
  const r = evalAssetAlert("PERCENT", 5, { lastPrice: 100, baseline: 100 }, 102);
  assert.equal(r.alert, false);
  assert.equal(r.newBaseline, 100);
});
