// Демо-эндпоинт для проверки Watcher: возвращает текущее время и случайное
// число, поэтому значение меняется на каждом запросе. Удобно убедиться, что
// мониторинг и алерты в Telegram работают (трекер «Свой селектор», селектор body).
export const dynamic = "force-dynamic";

export function GET() {
  const value = `${new Date().toISOString()} · ${Math.floor(Math.random() * 1_000_000)}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Watcher demo</title></head><body><p id="value">${value}</p></body></html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
