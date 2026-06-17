import { test } from "node:test";
import assert from "node:assert/strict";
import * as cheerio from "cheerio";
import { compare, toStoredValue, extractPrice } from "./check";

const price = (html: string) => extractPrice(cheerio.load(html));

test("extractPrice: JSON-LD offers.price", () => {
  const html = `<script type="application/ld+json">
    {"@type":"Product","offers":{"@type":"Offer","price":"1299","priceCurrency":"RUB"}}
  </script>`;
  assert.equal(price(html), "1299 ₽");
});

test("extractPrice: meta product:price", () => {
  const html = `<meta property="product:price:amount" content="19.99">
                <meta property="product:price:currency" content="USD">`;
  assert.equal(price(html), "19.99 $");
});

test("extractPrice: элемент с классом price", () => {
  const html = `<div class="product"><span class="price">2 499 ₽</span></div>`;
  assert.equal(price(html), "2 499 ₽");
});

test("extractPrice: регэксп по тексту страницы", () => {
  const html = `<body><p>Сейчас всего 990 руб за штуку</p></body>`;
  assert.equal(price(html), "990 руб");
});

test("extractPrice: цены нет — null", () => {
  assert.equal(price(`<body><p>Описание товара без цены</p></body>`), null);
});

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
