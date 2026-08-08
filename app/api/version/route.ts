/*
 * GET /api/version — текущая версия деплоя (git SHA).
 * Клиентский UpdateBanner сравнивает эту версию с SHA, вшитым в его JS-бандл.
 * Если после нового деплоя они различаются — показываем баннер и принудительно
 * обновляем страницу, чтобы пользователь получил свежий клиентский код.
 * force-dynamic: Vercel может кэшировать GET-ответы, а нам нужен актуальный SHA.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  // NEXT_PUBLIC_* вшивается в бандл при сборке; VERCEL_GIT_COMMIT_SHA доступен
  // в рантайме серверной функции. Берём любой доступный — оба актуальны для деплоя.
  const version =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    "local";
  return NextResponse.json({ version });
}
