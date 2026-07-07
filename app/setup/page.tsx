/*
 * Страница /setup — создание первого администратора.
 * Доступна только если в БД нет ни одного пользователя.
 * После создания первого админа — редирект на /login (страница недоступна).
 */
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/db";
import { redirect } from "next/navigation";
import { SetupForm } from "./SetupForm";

export const metadata = {
  title: "Начальная настройка — SV Progs Assistant",
};

export default async function SetupPage() {
  const userCount = await db.user.count();

  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full rounded-xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Начальная настройка
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Создайте первого администратора системы
          </p>
        </div>

        <SetupForm />
      </div>
    </div>
  );
}
