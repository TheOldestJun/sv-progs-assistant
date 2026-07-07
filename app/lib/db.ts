/*
 * Prisma-клиент синглтон для Next.js (Prisma v7).
 * Использует @prisma/adapter-mariadb для прямого MySQL/MariaDB подключения.
 * Предотвращает множественные инстансы в dev-режиме (hot reload).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set("connectionLimit", "2");
  const adapter = new PrismaMariaDb(url.toString());
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
