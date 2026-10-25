import { test } from "node:test";
import assert from "node:assert/strict";
import { registrableDomain, isPlatformHost, expiryFromWhois, expiryFromRdap } from "./domain";

test("registrableDomain: поддомены, многоуровневые зоны, кириллица, IP", () => {
  assert.equal(registrableDomain("https://shop.acme.ru/catalog?x=1"), "acme.ru");
  assert.equal(registrableDomain("www.example.com"), "example.com");
  assert.equal(registrableDomain("https://my.shop.com.ru"), "shop.com.ru");
  assert.equal(registrableDomain("https://news.bbc.co.uk"), "bbc.co.uk");
  assert.equal(registrableDomain("https://кц.рф"), "xn--j1ay.xn--p1ai");
  assert.equal(registrableDomain("http://127.0.0.1:3000"), null);
  assert.equal(registrableDomain("localhost"), null);
  assert.equal(registrableDomain(""), null);
});

test("isPlatformHost: поддомены хостингов", () => {
  assert.equal(isPlatformHost("acme.vercel.app"), true);
  assert.equal(isPlatformHost("vercel.app"), true);
  assert.equal(isPlatformHost("user.github.io"), true);
  assert.equal(isPlatformHost("myvercel.app.ru"), false);
  assert.equal(isPlatformHost("acme.ru"), false);
});

test("expiryFromWhois: форматы реестров", () => {
  assert.deepEqual(
    expiryFromWhois("domain: YANDEX.RU\npaid-till:     2027-09-30T21:00:00Z\n"),
    new Date("2027-09-30T21:00:00Z")
  );
  assert.deepEqual(
    expiryFromWhois("Registry Expiry Date: 2027-03-08T19:12:48Z"),
    new Date("2027-03-08T19:12:48Z")
  );
  assert.deepEqual(expiryFromWhois("Expiration Date: 2028.01.15"), new Date("2028-01-15"));
  assert.deepEqual(expiryFromWhois("expire: 15.01.2028"), new Date("2028-01-15"));
  assert.equal(expiryFromWhois("No entries found"), null);
});

test("expiryFromRdap: событие expiration", () => {
  const json = {
    events: [
      { eventAction: "registration", eventDate: "2007-10-09T18:20:50Z" },
      { eventAction: "expiration", eventDate: "2028-10-09T18:20:50Z" },
    ],
  };
  assert.deepEqual(expiryFromRdap(json), new Date("2028-10-09T18:20:50Z"));
  assert.equal(expiryFromRdap({}), null);
  assert.equal(expiryFromRdap(null), null);
});
