#!/usr/bin/env bash
# Запуск Watcher 2.0 в проде: GitHub-cron + вебхук бота + проверка.
# Секреты берутся из ~/watcher/.env и никуда не печатаются.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
URL="https://watcher-puce.vercel.app"

echo "1/3 Секреты для GitHub Actions (пульс проверок раз в 5 мин)…"
printf '%s' "$URL" | gh secret set WATCHER_URL
printf '%s' "$CRON_SECRET" | gh secret set CRON_SECRET

echo "2/3 Подключаю бота к вебхуку…"
npm run -s bot:webhook -- set "$URL" | grep -E '"ok"|description' || true

echo "3/3 Проверяю движок в проде…"
code=$(curl -s -o /tmp/watcher-cron.json -w '%{http_code}' -H "Authorization: Bearer $CRON_SECRET" "$URL/api/cron/check")
if [ "$code" = "200" ]; then
  echo "✅ Движок работает: $(cat /tmp/watcher-cron.json)"
  gh workflow run checks >/dev/null 2>&1 && echo "✅ GitHub Actions запущен" || true
else
  echo "❌ Ответ $code — секреты на Vercel не совпадают или не сделан Redeploy"
fi
