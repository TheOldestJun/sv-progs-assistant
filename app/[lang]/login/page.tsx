/*
 * Страница входа: форма email + пароль.
 * Если в БД нет пользователей — редирект на /setup.
 */
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/db";
import { redirect } from "@/i18n/navigation";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const userCount = await db.user.count();

  if (userCount === 0) {
    redirect({ href: "/setup", locale: lang });
  }

  return <LoginForm />;
}
