/*
 * Страница принудительной смены пароля (mustChangePassword).
 * После успешной смены — редирект в /admin.
 */
"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { changePasswordAction } from "../lib/auth";

export default function ChangePasswordPage() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state && "success" in state) {
      const t = setTimeout(() => router.push("/admin"), 1500);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Смена пароля
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Администратор сбросил ваш пароль. Старый пароль больше не
            действует. Придумайте новый.
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          {state && "success" in state && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
              {state.message}
            </div>
          )}
          {state && "error" in state && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              {state.error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
              Новый пароль
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="не менее 6 символов"
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-foreground">
              Подтвердите пароль
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              placeholder="повторите пароль"
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
            {isPending ? "Сохранение..." : "Сменить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}
