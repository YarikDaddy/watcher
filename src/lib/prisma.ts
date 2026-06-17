import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7: подключение к БД идёт через driver-adapter, а не через url в schema.
// Singleton, чтобы при hot-reload в dev не плодить подключения.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Явно ставим sslmode=verify-full вместо устаревших prefer/require/verify-ca,
// чтобы убрать deprecation-warning pg (фактическое поведение и так verify-full).
function normalizeSsl(url?: string): string | undefined {
  return url?.replace(/sslmode=(prefer|require|verify-ca)\b/, "sslmode=verify-full");
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: normalizeSsl(process.env.DATABASE_URL) });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
