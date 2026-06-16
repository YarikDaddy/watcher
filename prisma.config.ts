import "dotenv/config";
import { defineConfig } from "prisma/config";

// Конфиг для Prisma CLI (db push, migrate, studio).
// Рантайм-подключение задаётся отдельно через driver-adapter в src/lib/prisma.ts.
//
// Используем process.env с пустым фолбэком, а не строгий env() из prisma/config:
// `prisma generate` (в postinstall) к БД не подключается и запускается в фазе
// сборки, где DATABASE_URL ещё нет — строгий env() там падал бы. Для db push /
// migrate / studio переменная подхватывается из .env через dotenv выше.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
