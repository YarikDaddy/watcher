/**
 * Отправка сообщений через Telegram Bot API.
 * Привязка аккаунта (получение chatId по токену) живёт в боте — src/worker/bot.ts.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[telegram] TELEGRAM_BOT_TOKEN не задан");
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("[telegram] sendMessage failed:", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[telegram] ошибка отправки:", err);
    return false;
  }
}
