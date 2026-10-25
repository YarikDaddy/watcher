import "dotenv/config";

/**
 * Включает/выключает вебхук бота.
 *   npm run bot:webhook -- set https://watcher-puce.vercel.app
 *   npm run bot:webhook -- delete   (для локального long-polling в npm run worker)
 *   npm run bot:webhook -- info
 * Нужны TELEGRAM_BOT_TOKEN и (для set) TELEGRAM_WEBHOOK_SECRET в .env.
 */
const [cmd = "info", baseUrl] = process.argv.slice(2);
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
const api = (method: string, body?: object) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).then((r) => r.json());

(async () => {
  if (cmd === "set") {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!baseUrl || !secret) throw new Error("Нужны URL сайта и TELEGRAM_WEBHOOK_SECRET");
    console.log(
      await api("setWebhook", {
        url: `${baseUrl.replace(/\/$/, "")}/api/telegram`,
        secret_token: secret,
        allowed_updates: ["message"],
        drop_pending_updates: true,
      })
    );
    console.log(
      await api("setMyCommands", {
        commands: [
          { command: "status", description: "Live summary of all sites" },
          { command: "help", description: "Commands" },
          { command: "stop", description: "Disconnect this chat" },
        ],
      })
    );
  } else if (cmd === "delete") {
    console.log(await api("deleteWebhook"));
  } else {
    console.log(await api("getWebhookInfo"));
  }
})();
