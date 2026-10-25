import "dotenv/config";
import cron from "node-cron";
import { runDueChecks } from "../lib/runner";
import { sendDueDigests } from "../lib/digest";
import { createBot } from "../lib/bot";

/**
 * Долгоживущий воркер — для локальной разработки или своего сервера (VPS).
 * В проде на Vercel тот же движок крутит /api/cron/check, а бот работает
 * через вебхук /api/telegram — этот процесс там не нужен.
 */
let running = false;

console.log("[worker] запущен, проверка каждую минуту");
cron.schedule("* * * * *", async () => {
  // Проход дольше минуты не должен наслаиваться на следующий.
  if (running) return;
  running = true;
  try {
    const stats = await runDueChecks({ deadlineMs: 55_000 });
    if (stats.checked || stats.failed) {
      console.log(`[worker] проверено ${stats.checked}, сбоев ${stats.failed} за ${stats.ms} мс`);
    }
    await sendDueDigests();
  } catch (err) {
    console.error("[worker] ошибка прохода:", err);
  } finally {
    running = false;
  }
});

// Бот в режиме long-polling (без вебхука). ⚠️ Если вебхук на Vercel включён,
// polling не запустится (409) — для локалки снимите вебхук: npm run bot:webhook -- delete
const bot = createBot();
if (bot) {
  bot.start({
    onStart: (info) => console.log(`[bot] запущен как @${info.username}`),
  });
}
