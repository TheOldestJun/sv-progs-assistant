/*
 * JWT utilities — единый модуль для подписи и проверки токенов.
 * Используется auth.ts (server actions) и proxy.ts (middleware).
 *
 * Два типа токенов:
 * - access token  (24h) — в cookie "session",       проверяется на каждом запросе
 * - refresh token (30d) — в cookie "refresh_token",  используется когда access просрочен
 *
 * Хранимые поля: sub (userId), name, email, roles.
 * ADMIN-роль даёт доступ только к admin-функциям — никаких неявных расширений прав.
 *
 * JWT_SECRET берётся из .env, инициализируется при первом импорте (module-level).
 */
import { jwtVerify, SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || (() => { throw new Error("JWT_SECRET не задан в .env"); })(),
);

/** Сериализованный пользователь — то, что лежит в JWT и возвращается из getSession() */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

/** Поля, которые мы кладём в JWT (sub = userId) */
export interface TokenPayload {
  sub: string;
  name: string;
  email: string;
  roles: string[];
}

/** Результат расшифровки с флагом «просрочен ли токен» */
export interface VerifyResult {
  user: SessionUser | null;
  expired: boolean;
}

/** Вернуть сырой секрет (используется в proxy.ts для ручного копирования в Response) */
export function getJwtSecret(): Uint8Array {
  return JWT_SECRET;
}

/*
 * verifyToken — упрощённая проверка, null при любой ошибке.
 * Используется в auth.ts (getSession), где не нужно различать причину отказа.
 */
export async function verifyToken(token: string): Promise<SessionUser | null> {
  const result = await verifyTokenDetailed(token);
  return result.user;
}

/*
 * verifyTokenDetailed — проверка с различением «просрочен» / «невалиден».
 * Используется в proxy.ts: если просрочен, middleware пробует refresh-токен.
 *
 * jose выбрасывает ошибку с текстом "expired" при истекшем сроке — ловим по err.message.
 * Другие ошибки (неверная подпись, битый токен) считаем невалидными.
 */
export async function verifyTokenDetailed(token: string): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      user: {
        id: payload.sub as string,
        name: (payload.name as string) || "",
        email: payload.email as string,
        roles: (payload.roles as string[]) || [],
      },
      expired: false,
    };
  } catch (err) {
    const expired = err instanceof Error && err.message.includes("expired");
    return { user: null, expired };
  }
}

/** Подписать access-токен с полями пользователя. Срок — 24 часа. */
export async function signToken(
  payload: TokenPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

/** Подписать refresh-токен с теми же полями. Срок — 30 дней. */
export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

/** Проверить refresh-токен — вернуть payload или null (любая ошибка → null). */
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub: payload.sub as string,
      name: (payload.name as string) || "",
      email: payload.email as string,
      roles: (payload.roles as string[]) || [],
    };
  } catch {
    return null;
  }
}
