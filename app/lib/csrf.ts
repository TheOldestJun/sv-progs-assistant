/*
 * CSRF protection via Origin/Referer header validation.
 *
 * Проверяет, что запрос пришёл с доверенного источника.
 * Используется в API-роутах для POST/PATCH/DELETE методов.
 * Server actions (Next.js) имеют встроенную CSRF-защиту через заголовки.
 *
 * Логика:
 * 1. Если есть Origin — сверяем с разрешёнными источниками
 * 2. Если нет Origin, но есть Referer — сверяем Referer
 * 3. Если нет ни того, ни другого — reject (механические запросы, curl и т.д.)
 *
 * Разрешённые источники:
 * - VERCEL_URL (продакшен)
 * - localhost (разработка)
 * - APP_URL из .env (кастомный домен)
 */

const ALLOWED_ORIGINS = new Set<string>();

function getAllowedOrigins(): Set<string> {
  if (ALLOWED_ORIGINS.size > 0) return ALLOWED_ORIGINS;

  if (process.env.VERCEL_URL) {
    ALLOWED_ORIGINS.add(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.APP_URL) {
    ALLOWED_ORIGINS.add(process.env.APP_URL);
  }

  ALLOWED_ORIGINS.add("http://localhost:3000");
  ALLOWED_ORIGINS.add("http://127.0.0.1:3000");

  return ALLOWED_ORIGINS;
}

function isTrusted(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowed = getAllowedOrigins();

    // В dev-режиме допускаем localhost на любом порту
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return true;
    }

    return allowed.has(parsed.origin);
  } catch {
    return false;
  }
}

export function verifyCsrf(request: Request): { valid: boolean; reason?: string } {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin) {
    if (isTrusted(origin)) {
      return { valid: true };
    }
    return { valid: false, reason: "Untrusted origin" };
  }

  if (referer) {
    if (isTrusted(referer)) {
      return { valid: true };
    }
    return { valid: false, reason: "Untrusted referer" };
  }

  // No Origin or Referer — reject mutation requests from outside browser
  return { valid: false, reason: "Missing origin and referer headers" };
}
