/*
 * Next.js Middleware (proxy.ts).
 *
 * Защищённые маршруты:
 *   - /admin/*          — только ADMIN (проверка роли после аутентификации)
 *   - /change-password  — любой аутентифицированный
 *   - /dashboard        — любой аутентифицированный
 *
 * Refresh-токен (silent refresh):
 *   Если access-токен просрочен, middleware проверяет refresh_token cookie.
 *   Если refresh валиден — подписывает новый access и кладёт его в response cookie.
 *   Браузер получает новый access без перезагрузки страницы.
 *   Это НЕ отменяет редирект на /login — если оба токена невалидны, идёт на логин.
 *
 * Нюансы:
 *   - После успешного refresh response.cookies.set() устанавливает куку на ответе.
 *     Все последующие запросы в рамках сессии уже будут с новым access-токеном.
 *   - Если пришла админ-страница, но роли ADMIN нет — редирект на /login,
 *     даже если аутентификация прошла.
 *   - Публичные маршруты (/, /login, /help, /api/*) не обрабатываются.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTokenDetailed, signToken, verifyRefreshToken } from "./app/lib/jwt";

const SESSION_COOKIE = "session";
const REFRESH_COOKIE = "refresh_token";

/*
 * Попытка аутентификации:
 *   1. Проверяем access-токен.
 *      - Валиден → { user } (пропускаем дальше).
 *      - Просрочен → пробуем refresh.
 *      - Невалиден → редирект на /login.
 *   2. Если access отсутствует или просрочен — проверяем refresh-токен.
 *      - Валиден → выпускаем новый access, возвращаем response с кукой.
 *      - Невалиден → редирект на /login.
 */
async function tryAuthenticate(
  request: NextRequest,
): Promise<{ user: { roles: string[] } } | NextResponse> {
  const accessToken = request.cookies.get(SESSION_COOKIE)?.value;

  // Пробуем access-токен
  if (accessToken) {
    const { user, expired } = await verifyTokenDetailed(accessToken);
    if (user) return { user }; // валиден — пропускаем
    if (!expired) return NextResponse.redirect(new URL("/login", request.url)); // невалиден — на логин
  }

  // Access просрочен или отсутствует — пробуем refresh
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.redirect(new URL("/login", request.url));

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) return NextResponse.redirect(new URL("/login", request.url));

  // Refresh валиден — выпускаем новый access (response с кукой)
  const newAccessToken = await signToken(payload);
  const response = NextResponse.next();
  response.cookies.set(SESSION_COOKIE, newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /change-password и /dashboard — любой аутентифицированный
  if (pathname === "/change-password" || pathname === "/dashboard") {
    const authResult = await tryAuthenticate(request);
    if (authResult instanceof NextResponse) return authResult; // редирект на /login или response с новым access
    return NextResponse.next();
  }

  // /admin/* — проверяем аутентификацию + роль ADMIN
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const authResult = await tryAuthenticate(request);
  if (authResult instanceof NextResponse) return authResult;

  // user уже верифицирован в tryAuthenticate — повторная верификация не нужна
  if (!authResult.user.roles.includes("ADMIN")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// Matcher — только эти маршруты проходят через middleware.
// Все остальные (/api/*, /, /help, /login) — без обработки.
export const config = {
  matcher: ["/admin/:path*", "/change-password", "/dashboard"],
};
