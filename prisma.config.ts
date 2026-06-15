import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Конфиг для Prisma CLI (db push, migrate, studio).
// Рантайм-подключение задаётся отдельно через driver-adapter в src/lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
