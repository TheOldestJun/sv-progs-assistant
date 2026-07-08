/*
 * Prisma-клиент синглтон для Next.js (Prisma v7).
 * Использует @prisma/adapter-mariadb для прямого MySQL/MariaDB подключения.
 * Предотвращает множественные инстансы в dev-режиме (hot reload).
 *
 * Во время next build (Vercel) возвращается Proxy-заглушка — реальный клиент
 * создаётся только при первом runtime-запросе. Страницы с БД должны иметь
 * dynamic = "force-dynamic", чтобы не рендериться на этапе сборки.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set — add to .env (dev) or Vercel env vars (prod)");
  }
  const url = new URL(raw);
  url.searchParams.set("connectionLimit", "2");
  const adapter = new PrismaMariaDb(url.toString());
  return new PrismaClient({ adapter });
}

function getDb(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  if (isBuildPhase()) {
    /*
     * Во время next build БД недоступна — любое обращение к db.*.*()
     * выбрасывает понятную ошибку. Если страница случайно обращается к БД
     * при сборке, нужно добавить export const dynamic = "force-dynamic".
     */
    const noop = new Proxy({ __buildNoop: true } as unknown as PrismaClient, {
      get(_, prop) {
        if (prop === "then" || prop === "catch") return undefined;
        return new Proxy(() => {}, {
          get(_, method) {
            return async () => {
              throw new Error(
                `db.${String(prop)}.${String(method)}() вызван при сборке — ` +
                  'добавь export const dynamic = "force-dynamic" на страницу'
              );
            };
          },
        });
      },
    });
    globalForPrisma.prisma = noop;
    return noop;
  }

  const instance = createPrismaClient();
  globalForPrisma.prisma = instance;
  return instance;
}

export const db = getDb();
