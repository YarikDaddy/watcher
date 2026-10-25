// Рендер промо-ролика кадр за кадром: node render.mjs ru|en
// Нужны puppeteer-core (npm i -g или локально) и ffmpeg.
import puppeteer from "puppeteer-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const lang = process.argv[2] === "en" ? "en" : "ru";
const FPS = 30, DURATION = 25.5;
const dir = process.env.PROMO_DIR ?? path.dirname(fileURLToPath(import.meta.url));
const frames = path.join(process.env.FRAMES_DIR ?? dir, `frames-${lang}`);
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(dir, "promo.html")).href + `?lang=${lang}`, { waitUntil: "load" });
await page.evaluate(() => window.ready);
const total = Math.round(FPS * DURATION);
for (let f = 0; f < total; f++) {
  await page.evaluate((s) => window.seek(s), f / FPS);
  await page.screenshot({ path: path.join(frames, `${String(f).padStart(4, "0")}.png`) });
  if (f % 60 === 0) process.stdout.write(`${f}/${total} `);
}
await browser.close();
const out = path.join(dir, `watcher-promo-${lang}.mp4`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "%04d.png"),
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", out]);
console.log("\n→", out);
