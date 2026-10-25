import { test } from "node:test";
import assert from "node:assert/strict";
import { isPrivateIp, isPublicHttpUrl, rateLimit } from "./net-guard";
import { gradeOf, speedLevel, sslLevel, domainLevel } from "./health-report";

test("isPrivateIp: внутренние сети и метаданные облака запрещены", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
    assert.equal(isPrivateIp(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "93.184.215.14", "2606:4700::1111"]) {
    assert.equal(isPrivateIp(ip), false, ip);
  }
});

test("isPublicHttpUrl: схема, порт, учётка, localhost — без сети", async () => {
  assert.equal(await isPublicHttpUrl("ftp://example.com"), false);
  assert.equal(await isPublicHttpUrl("http://example.com:8080"), false);
  assert.equal(await isPublicHttpUrl("http://user:pass@example.com"), false);
  assert.equal(await isPublicHttpUrl("http://localhost"), false);
  assert.equal(await isPublicHttpUrl("http://127.0.0.1"), false);
  assert.equal(await isPublicHttpUrl("http://[::1]/"), false);
  assert.equal(await isPublicHttpUrl("http://169.254.169.254/latest/meta-data"), false);
  assert.equal(await isPublicHttpUrl("https://8.8.8.8"), true);
});

test("rateLimit: окно и лимит", () => {
  const key = `t:${Math.random()}`;
  assert.equal(rateLimit(key, 2), true);
  assert.equal(rateLimit(key, 2), true);
  assert.equal(rateLimit(key, 2), false);
});

test("оценка сайта A–F", () => {
  assert.equal(speedLevel(300), "good");
  assert.equal(speedLevel(1500), "warn");
  assert.equal(sslLevel(5), "bad");
  assert.equal(domainLevel(30), "warn");
  assert.equal(gradeOf([{ key: "online", level: "good" }, { key: "ssl", level: "good" }]), "A");
  assert.equal(gradeOf([{ key: "online", level: "good" }, { key: "ssl", level: "warn" }]), "B");
  assert.equal(gradeOf([{ key: "speed", level: "warn" }, { key: "ssl", level: "warn" }]), "C");
  assert.equal(gradeOf([{ key: "online", level: "bad" }, { key: "domain", level: "unknown" }]), "F");
});
