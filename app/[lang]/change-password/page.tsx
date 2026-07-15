/*
 * Страница принудительной смены пароля (mustChangePassword).
 * После успешной смены — редирект в /admin.
 */
"use client";

import { useActionState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { changePasswordAction } from "@/app/lib/auth";
import { useTranslations } from "next-intl";

export default function ChangePasswordPage() {
  const t = useTranslations("auth.changePassword");
  const tc = useTranslations("common");
  const tt = useTranslations("toasts");
  const [state, formAction, isPending] = useActionState(changePasswordAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state && "success" in state) {
      const timer = setTimeout(() => router.push("/admin"), 1500);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t("subtitle")}
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          {state && "success" in state && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
              {tt("passwordChanged")}
            </div>
          )}
          {state && "error" in state && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              {state.error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
              {t("newPassword")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder={t("newPasswordPlaceholder")}
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-foreground">
              {t("confirmPassword")}
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              placeholder={t("confirmPasswordPlaceholder")}
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t("submitting") : t("submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
