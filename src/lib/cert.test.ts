import { test } from "node:test";
import assert from "node:assert/strict";
import { evalCertAlert } from "./cert";

test("вне зоны порога — без алерта", () => {
  assert.equal(evalCertAlert(14, null, 30).alert, false);
  assert.equal(evalCertAlert(14, 30, 20).alert, false);
});

test("первый замер уже в зоне порога — алерт", () => {
  const ev = evalCertAlert(14, null, 10);
  assert.equal(ev.alert, true);
  assert.equal(ev.expired, false);
});

test("вход в зону порога сверху — алерт один раз", () => {
  assert.equal(evalCertAlert(14, 15, 13).alert, true); // пересекли 14
  assert.equal(evalCertAlert(14, 13, 12).alert, false); // уже внутри, рубеж не пройден
});

test("пересечение стадии 7 — алерт", () => {
  assert.equal(evalCertAlert(14, 8, 7).alert, true);
  assert.equal(evalCertAlert(14, 7, 6).alert, false);
});

test("истечение (0 дней) — алерт + expired", () => {
  const ev = evalCertAlert(14, 2, 0);
  assert.equal(ev.alert, true);
  assert.equal(ev.expired, true);
});

test("уже просрочен на первом замере — алерт + expired", () => {
  const ev = evalCertAlert(14, null, -5);
  assert.equal(ev.alert, true);
  assert.equal(ev.expired, true);
});

test("перевыпуск серта (дни выросли) — без алерта", () => {
  assert.equal(evalCertAlert(14, 1, 365).alert, false);
});
