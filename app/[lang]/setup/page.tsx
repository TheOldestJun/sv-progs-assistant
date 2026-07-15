/*
 * Страница /setup — создание первого администратора.
 * Доступна только если в БД нет ни одного пользователя.
 * После создания первого админа — редирект на /login (страница недоступна).
 */
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/db";
import { redirect } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { SetupForm } from "./SetupForm";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "auth.setup" });

  const userCount = await db.user.count();

  if (userCount > 0) {
    redirect({ href: "/login", locale: lang });
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full rounded-xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t("subtitle")}
          </p>
        </div>

        <SetupForm />
      </div>
    </div>
  );
}
