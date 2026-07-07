/*
 * Страница входа: форма email + пароль.
 * Если в БД нет пользователей — редирект на /setup.
 */
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/db";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const userCount = await db.user.count();

  if (userCount === 0) {
    redirect("/setup");
  }

  return <LoginForm />;
}
