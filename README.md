# Watcher

Отслеживай изменения на любом сайте и получай мгновенные уведомления в Telegram.

Указываешь URL и CSS-селектор — Watcher периодически проверяет страницу и присылает алерт,
когда меняется цена, появляется товар в наличии, публикуется вакансия или меняется любой текст.

> Статус: ранний MVP, в активной разработке (#buildinpublic).

## Возможности (MVP)

- 🔗 Трекеры: URL + CSS-селектор + интервал проверки
- 🔁 Два режима: изменение текста и появление/исчезновение элемента
- 📲 Мгновенные уведомления в Telegram
- 📊 Дашборд со статусом и историей срабатываний
- 🆓 Бесплатный тариф: 3 трекера, проверка раз в час

## Стек

- **Next.js (App Router) + TypeScript** — UI, API, лендинг
- **PostgreSQL + Prisma** — данные
- **Воркер на node-cron** — фоновые проверки (отдельный процесс)
- **cheerio** — парсинг HTML
- **grammY** — Telegram-бот

## Архитектура

```
Next.js (UI + API) ──► PostgreSQL ◄── Worker (node-cron)
                                          │ fetch + cheerio
                                          ▼
                                    Telegram Bot
```

## Локальный запуск

```bash
# 1. Зависимости
npm install

# 2. Окружение
cp .env.example .env   # заполни DATABASE_URL и TELEGRAM_BOT_TOKEN

# 3. БД
npm run db:push        # применить схему к Postgres
npm run db:generate    # сгенерировать Prisma Client

# 4. Запуск (в двух терминалах)
npm run dev            # веб-приложение на http://localhost:3000
npm run worker         # фоновый воркер проверок

# Тесты
npm test
```

## Деплой

Веб и воркер деплоятся раздельно — воркер это постоянный процесс (cron + Telegram
long-polling) и не работает на serverless.

- **Веб (Next.js) → Vercel.** Импортировать GitHub-репозиторий. Env: `DATABASE_URL`,
  `TELEGRAM_BOT_USERNAME`. Сборка стандартная (`prisma generate` запускается в `postinstall`).
- **Воркер → Railway.** Тот же репозиторий, start-команда `npm run worker`. Env:
  `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`.
- **БД → Neon** (Postgres). Один `DATABASE_URL` на оба сервиса.

## Структура

```
prisma/schema.prisma   — модель данных (User, Tracker, Snapshot, Alert)
src/lib/prisma.ts       — Prisma Client (singleton)
src/lib/check.ts        — загрузка страницы, извлечение по селектору, сравнение
src/lib/telegram.ts     — отправка сообщений в Telegram
src/worker/index.ts     — планировщик проверок (node-cron) + запуск бота
src/worker/bot.ts       — Telegram-бот привязки аккаунта (grammY, /start <token>)
src/app/                — Next.js приложение
```

## Roadmap

- [x] Каркас: схема БД, модуль проверки, воркер, Telegram
- [x] Аутентификация (email + пароль, сессии в БД) и защищённый дашборд
- [x] CRUD трекеров (добавление, список, удаление, лимит свободного тарифа)
- [x] Привязка Telegram через бота (deep-link `/start`, бот в процессе воркера)
- [x] Лендинг
- [ ] Деплой (Vercel + Railway)
- [ ] Тарифы и оплата (после первых пользователей)
- [ ] JS-рендеринг (Playwright) для динамических сайтов

## Лицензия

MIT
