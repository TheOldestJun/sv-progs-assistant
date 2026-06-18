/*
 * Страница входа: форма email + пароль.
 * Использует server action loginAction (useActionState).
 * При успехе — редирект на /admin.
 */
"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "../lib/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Вход в систему
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Введите email и пароль для входа
          </p>
        </div>

        <form action={formAction} className="space-y-5">
          {state && "error" in state && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              {state.error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="your@email.com"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Пароль
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Вход..." : "Войти"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-secondary">
          Нет аккаунта? Обратитесь к администратору.
        </p>
      </div>

      <Link
        href="/"
        className="mt-6 text-sm text-text-secondary transition-colors hover:text-foreground"
      >
        &larr; На главную
      </Link>
    </div>
  );
}
