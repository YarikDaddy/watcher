# Watcher

**Узнайте раньше клиента.** Мониторинг сайтов для веб-студий и фрилансеров: доступность,
SSL и домены всех клиентов в одном пульте, алерты в Telegram и статус-страницы под вашим брендом.

> Статус: публичная бета, строится в открытую (#buildinpublic).

## Возможности

- ⚡ **Аптайм** каждые 5 минут: время ответа, подтверждение сбоя перед алертом (без ложных тревог), «снова работает» с длительностью простоя, журнал инцидентов
- 🔒 **SSL**: предупреждения за 14 / 7 / 3 / 1 день до истечения
- 🌐 **Домены**: срок регистрации через RDAP, для `.ru` / `.рф` / `.su` и других — через WHOIS
- ➕ **Сайт в одно поле**: адрес → сразу три проверки и мгновенный первый прогон
- 🗂️ **Клиенты**: сайты сгруппированы по заказчику, клиент создаётся прямо из формы
- 🪪 **White-label статус-страница** на клиента: 90 дней аптайма, история инцидентов, ваш бренд
- ✈️ **Telegram-бот**: алерты, `/status` — живая сводка, отчёт за неделю по понедельникам
- 🔎 **Бесплатная проверка сайта** на лендинге без регистрации (оценка A–F) — с защитой от SSRF
- 💰 Дополнительно: цены, любой элемент страницы (CSS-селектор), крипта / металлы / курсы
- 🌍 RU / EN везде: интерфейс, алерты, статус-страницы

## Стек

Next.js 16 (App Router, TS) · PostgreSQL (Neon) + Prisma 7 · cheerio · grammY · Tailwind 4

## Архитектура

Один движок проверок (`src/lib/runner.ts`), два способа его крутить:

```
                 ┌── /api/cron/check (Vercel, serverless) ◄── внешний cron раз в минуту
runner.ts ───────┤
                 └── npm run worker (свой сервер / локально, node-cron)

Telegram-бот: /api/telegram (вебхук, прод)  или  long-polling в npm run worker (локально)
```

Без состояния в памяти: всё в БД. Параллельные проходы не мешают друг другу —
трекер «арендуется» атомарным `updateMany` по `nextCheckAt`.

## Локальный запуск

```bash
npm install
cp .env.example .env          # DATABASE_URL, TELEGRAM_BOT_TOKEN, ...
npm run db:push               # схема → Postgres
npm run dev                   # http://localhost:3000
npm run worker                # проверки + бот (long-polling)
npm test
```

Быстрая локальная БД: `docker run -d -p 55432:5432 -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=watcher postgres:17-alpine`
и `DATABASE_URL=postgresql://postgres:dev@127.0.0.1:55432/watcher`.

## Деплой (бесплатно, без постоянного процесса)

1. **БД → Neon.** `npm run db:push` с прод-`DATABASE_URL` (изменения схемы аддитивные).
2. **Веб → Vercel.** Env: `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`,
   `CRON_SECRET`, `TELEGRAM_WEBHOOK_SECRET` (секреты — любые длинные случайные строки:
   `openssl rand -hex 24`).
3. **Бот → вебхук:** `npm run bot:webhook -- set https://<ваш-домен>` (берёт токен и секрет из `.env`).
4. **Пульс движка** — любой из вариантов:
   - [cron-job.org](https://cron-job.org) (бесплатно, раз в минуту): `GET https://<домен>/api/cron/check`
     с заголовком `Authorization: Bearer <CRON_SECRET>`;
   - GitHub Actions (`.github/workflows/cron.yml`, раз в 5 мин): секреты репозитория `WATCHER_URL`, `CRON_SECRET`.
   - Vercel Cron из `vercel.json` (раз в сутки) — страховка.

Воркер на Railway больше не нужен. Для локального long-polling снимите вебхук: `npm run bot:webhook -- delete`.

## Структура

```
src/lib/runner.ts       — движок: выбор созревших трекеров, аренда, пул, все режимы
src/lib/uptime.ts       — HTTP-проверка, машина состояний «упал/поднялся», проценты, полосы
src/lib/domain.ts       — срок домена: RDAP + WHOIS, регистрируемый домен, хостинги
src/lib/cert.ts         — срок SSL-сертификата (TLS), рубежи предупреждений
src/lib/digest.ts       — /status и недельный отчёт в Telegram
src/lib/bot.ts          — Telegram-бот (вебхук или polling)
src/lib/sites.ts        — «сайт» = аптайм + SSL + домен одного хоста
src/lib/net-guard.ts    — защита от SSRF и rate limit для публичной проверки
src/app/page.tsx        — лендинг + бесплатная проверка (site-checker.tsx)
src/app/dashboard/      — пульт агентства
src/app/status/[token]  — публичная статус-страница клиента
src/app/api/            — cron, telegram-вебхук
```
