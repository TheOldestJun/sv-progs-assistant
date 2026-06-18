/*
 * Server actions для аутентификации и управления пользователями.
 * - Вход/выход через JWT в httpOnly cookie
 * - CRUD пользователей (только ADMIN) с множественными ролями
 * - Хэширование паролей (bcrypt, 12 раундов)
 */
"use server";

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import type { Role } from "../generated/prisma/enums";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret"
);

const COOKIE_NAME = "session";

export interface SessionUser {
  id: string;
  email: string;
  roles: Role[];
}

/** Результат server action: успех с сообщением, либо ошибка */
export type ActionResult =
  | { success: true; message: string }
  | { error: string }
  | null
  | undefined;

/** Хэширует пароль (bcrypt, 12 раундов) */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** Верифицирует JWT-токен и возвращает данные сессии */
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.sub as string,
      email: payload.email as string,
      roles: (payload.roles as Role[]) || [],
    };
  } catch {
    return null;
  }
}

/** Читает session cookie и возвращает данные пользователя */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Server Action: вход в систему */
export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Заполните все поля" };

  const user = await db.user.findUnique({
    where: { email },
    include: { roles: { select: { role: true } } },
  });
  if (!user) return { error: "Неверный email или пароль" };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return { error: "Неверный email или пароль" };

  const roles = user.roles.map((r) => r.role);

  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    roles,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  redirect("/admin");
}

/** Server Action: выход из системы */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/login");
}

/** Server Action: создать пользователя (только ADMIN) */
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

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Пользователь с таким email уже существует" };

  const hashed = await hashPassword(password);
  await db.user.create({
    data: {
      name,
      email,
      password: hashed,
      roles: {
        create: selectedRoles.map((role) => ({ role })),
      },
    },
  });

  return { success: true, message: "Пользователь успешно создан" };
}

/** Server Action: обновить пользователя (только ADMIN) */
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

  const updateData: Record<string, string> = { name, email };
  if (password) {
    updateData.password = await hashPassword(password);
  }

  await db.$transaction([
    db.userRole.deleteMany({ where: { userId: id } }),
    db.userRole.createMany({
      data: selectedRoles.map((role) => ({ userId: id, role })),
    }),
    db.user.update({ where: { id }, data: updateData }),
  ]);

  return { success: true, message: "Пользователь успешно обновлён" };
}

/** Server Action: удалить пользователя (только ADMIN, нельзя удалить себя) */
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
