/*
 * Server actions для аутентификации и управления пользователями.
 * Все экспортируемые функции — server actions (запускаются на сервере, клиент их вызывает).
 *
 * Куки:
 *   - "session"       — httpOnly, 24h, JWT access token (sub, name, email, roles)
 *   - "refresh_token" — httpOnly, 30d, JWT refresh token (те же поля)
 *
 * Роли (Role enum в Prisma): ADMIN, HEAD_OF_SUPPLY, SUPPLY_DEPT, WAREHOUSE, REQUESTER
 *   - ADMIN не получает неявно все роли — нужно явно назначать.
 *   - Админка (/admin) проверяет session.roles.includes("ADMIN").
 *
 * Rate limiting:
 *   - По IP (x-forwarded-for/x-real-ip).
 *   - 5 неудачных попыток → блокировка 1 мин, далее экспоненциально до 30 мин.
 *   - Сбрасывается при успешном входе.
 *
 * Хэши: bcrypt, 12 раундов.
 */
"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import type { Role } from "@prisma/client";
import { verifyToken, signToken, signRefreshToken, verifyRefreshToken } from "./jwt";
import type { SessionUser } from "./jwt";
import { checkRateLimit, recordAttempt } from "./rate-limit";

const SESSION_COOKIE = "session";
const REFRESH_COOKIE = "refresh_token";

/** Результат server action: успех с сообщением, либо ошибка */
export type ActionResult =
  | { success: true; message: string }
  | { error: string }
  | null
  | undefined;

/** Простейшая валидация email — проверяет формат xxx@yyy.zzz */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Хэширует пароль (bcrypt, 12 раундов). Используется при создании/смене пароля. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** Прочитать session cookie и вернуть данные пользователя (или null, если невалидный/просрочен) */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/*
 * Server Action: вход в систему.
 * - Проверяет rate limit по IP
 * - Ищет пользователя по email, сверяет bcrypt
 * - При mustChangePassword — перенаправляет на /change-password
 * - Устанавливает session + refresh_token cookies
 * - Редиректит ADMIN → /admin, остальных → /dashboard
 *
 * Сообщение об ошибке одинаковое для "нет пользователя" и "неверный пароль"
 * (чтобы не раскрывать существующие email).
 */
export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Заполните все поля" };

  // Rate limit по IP: блокируем если слишком много попыток
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const rl = checkRateLimit(`login:${ip}`);
  if (!rl.allowed) {
    return { error: `Слишком много попыток. Повторите через ${rl.retryAfter} сек.` };
  }

  const user = await db.user.findUnique({
    where: { email },
    include: { roles: { select: { role: true } } },
  });
  if (!user) {
    recordAttempt(`login:${ip}`, false);
    return { error: "Неверный email или пароль" };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    recordAttempt(`login:${ip}`, false);
    if (user.mustChangePassword) {
      return { error: "Ваш пароль был сброшен администратором. Используйте временный пароль для входа." };
    }
    return { error: "Неверный email или пароль" };
  }

  // Успешный вход — сбрасываем счётчик rate limit
  recordAttempt(`login:${ip}`, true);

  const roles = user.roles.map((r) => r.role);

  // Подписываем оба токена с одинаковыми данными
  const token = await signToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    roles,
  });
  const refreshToken = await signRefreshToken({
    sub: user.id,
    name: user.name,
    email: user.email,
    roles,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
  });
  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30d
  });

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  redirect(roles.includes("ADMIN") ? "/admin" : "/dashboard");
}

/** Server Action: выход из системы — удаляем обе куки */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  redirect("/login");
}

/** Server Action: продлить сессию по refresh-токену (выпустить новый access token) */
export async function refreshSessionAction(): Promise<ActionResult> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return { error: "Сессия истекла" };

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    // Refresh невалиден — чистим всё
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete(REFRESH_COOKIE);
    return { error: "Сессия истекла" };
  }

  const newToken = await signToken(payload);
  cookieStore.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return { success: true, message: "Сессия продлена" };
}

/* ============================================================
 * Управление пользователями — все функции только для ADMIN
 * ============================================================ */

/** Server Action: создать пользователя (только ADMIN). Пароль обязателен, хэшируется bcrypt. */
export async function createUserAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !session.roles.includes("ADMIN")) {
    return { error: "Доступ запрещён" };
  }

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const selectedRoles = formData.getAll("roles") as Role[];

  if (!name || !email || !password || selectedRoles.length === 0) {
    return { error: "Заполните все поля и выберите хотя бы одну роль" };
  }
  if (!isValidEmail(email)) {
    return { error: "Некорректный формат email" };
  }
  if (password.length < 6) {
    return { error: "Пароль должен быть не менее 6 символов" };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Пользователь с таким email уже существует" };

  const hashed = await hashPassword(password);
  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashed,
      roles: {
        create: selectedRoles.map((role) => ({ role })),
      },
    },
    include: { roles: true },
  });

  // Если пользователю назначена роль REQUESTER, сразу создаём запись в Requester,
  // чтобы он отображался в автокомплите заявителей в панели начальника снабжения.
  if (selectedRoles.includes("REQUESTER")) {
    await db.requester.create({ data: { name, userId: user.id } });
  }

  return { success: true, message: "Пользователь успешно создан" };
}

/** Server Action: обновить пользователя (только ADMIN). Пароль опционален. Роли — чекбоксы. */
export async function updateUserAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || !session.roles.includes("ADMIN")) {
    return { error: "Доступ запрещён" };
  }

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const selectedRoles = formData.getAll("roles") as Role[];

  if (!id || !name || !email || selectedRoles.length === 0) {
    return { error: "Заполните все поля и выберите хотя бы одну роль" };
  }
  if (!isValidEmail(email)) {
    return { error: "Некорректный формат email" };
  }
  if (password && password.length < 6) {
    return { error: "Пароль должен быть не менее 6 символов" };
  }

  const updateData: Record<string, string> = { name, email };
  if (password) {
    updateData.password = await hashPassword(password);
  }

  // Транзакция: удаляем старые роли, создаём новые, обновляем данные
  // ВАЖНО: если между deleteMany и createMany произойдёт ошибка, пользователь останется без ролей.
  await db.$transaction([
    db.userRole.deleteMany({ where: { userId: id } }),
    db.userRole.createMany({
      data: selectedRoles.map((role) => ({ userId: id, role })),
    }),
    db.user.update({ where: { id }, data: updateData }),
  ]);

  // Если пользователю назначена роль REQUESTER, убеждаемся что есть запись в Requester.
  if (selectedRoles.includes("REQUESTER")) {
    const existing = await db.requester.findUnique({ where: { userId: id } });
    if (!existing) {
      await db.requester.create({ data: { name, userId: id } });
    }
  }

  return { success: true, message: "Пользователь успешно обновлён" };
}

/* ============================================================
 * Сброс пароля — два этапа:
 *   1. Пользователь отправляет запрос (requestPasswordResetAction)
 *   2. ADMIN обрабатывает запрос (resetUserPasswordAction)
 * ============================================================ */

/** Server Action: запрос сброса пароля. Создаёт PENDING-запрос для админа.
 *  Если пользователь не найден — всё равно возвращаем успех (чтобы не раскрывать email). */
export async function requestPasswordResetAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = (formData.get("email") as string)?.trim();
  if (!email) return { error: "Введите email" };

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return { success: true, message: "Запрос отправлен администратору" };
  }

  const existing = await db.passwordResetRequest.findFirst({
    where: { userId: user.id, status: "PENDING" },
  });
  if (!existing) {
    await db.passwordResetRequest.create({ data: { userId: user.id } });
  }

  return { success: true, message: "Запрос отправлен администратору" };
}

/** Server Action: сбросить пароль пользователя на reset123 (только ADMIN).
 *  После сброса mustChangePassword = true — пользователь сменит пароль при входе. */
export async function resetUserPasswordAction(
  requestId: string
): Promise<{ success: true; message: string } | { error: string }> {
  const session = await getSession();
  if (!session || !session.roles.includes("ADMIN")) {
    return { error: "Доступ запрещён" };
  }

  const request = await db.passwordResetRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.status !== "PENDING") {
    return { error: "Запрос не найден или уже обработан" };
  }

  const defaultPassword = "reset123";
  const hashed = await hashPassword(defaultPassword);

  await db.$transaction([
    db.passwordResetRequest.update({
      where: { id: requestId },
      data: { status: "RESET", resolvedAt: new Date() },
    }),
    db.user.update({
      where: { id: request.userId },
      data: { password: hashed, mustChangePassword: true },
    }),
  ]);

  return {
    success: true,
    message: `Пароль сброшен на ${defaultPassword}. Пользователь сменит его при входе.`,
  };
}

/* ============================================================
 * Первоначальная настройка (создание первого админа)
 * ============================================================ */

/** Server Action: создать первого администратора (доступно только если в БД нет пользователей). */
export async function setupAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Заполните все поля" };
  }
  if (!isValidEmail(email)) {
    return { error: "Некорректный формат email" };
  }
  if (password.length < 6) {
    return { error: "Пароль должен быть не менее 6 символов" };
  }

  const existingUsers = await db.user.count();
  if (existingUsers > 0) {
    return { error: "Пользователь уже создан. Войдите в систему." };
  }

  const hashed = await hashPassword(password);
  await db.user.create({
    data: {
      name,
      email,
      password: hashed,
      roles: {
        create: [
          { role: "ADMIN" },
          { role: "HEAD_OF_SUPPLY" },
          { role: "SUPPLY_DEPT" },
          { role: "WAREHOUSE" },
        ],
      },
    },
  });

  return { success: true, message: "Администратор создан. Войдите в систему." };
}

/* ============================================================
 * Смена пароля
 * ============================================================ */

/** Server Action: сменить пароль. Если mustChangePassword = true — перестаёт быть true. */
export async function changePasswordAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "Необходимо войти в систему" };

  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 6) {
    return { error: "Пароль должен быть не менее 6 символов" };
  }
  if (password !== confirm) {
    return { error: "Пароли не совпадают" };
  }

  const hashed = await hashPassword(password);
  await db.user.update({
    where: { id: session.id },
    data: { password: hashed, mustChangePassword: false },
  });

  return { success: true, message: "Пароль успешно изменён" };
}

/** Server Action: удалить пользователя (только ADMIN, нельзя удалить самого себя) */
export async function deleteUserAction(
  id: string
): Promise<{ success: true; message: string } | { error: string }> {
  const session = await getSession();
  if (!session || !session.roles.includes("ADMIN")) {
    return { error: "Доступ запрещён" };
  }
  if (id === session.id) {
    return { error: "Нельзя удалить самого себя" };
  }

  await db.user.delete({ where: { id } });
  return { success: true, message: "Пользователь удалён" };
}
