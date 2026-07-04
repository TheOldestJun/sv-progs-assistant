/*
 * Страница входа: форма email + пароль.
 * При mustChangePassword — редирект на /change-password.
 * "Забыли пароль?" → форма отправки запроса администратору.
 */
"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, requestPasswordResetAction } from "../lib/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showResetForm, setShowResetForm] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full rounded-xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {showResetForm ? "Сброс пароля" : "Вход в систему"}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {showResetForm
              ? "Введите email — администратор получит запрос"
              : "Введите email и пароль для входа"}
          </p>
        </div>

        {showResetForm ? (
          <ResetForm onBack={() => setShowResetForm(false)} />
        ) : (
          <>
            <form action={formAction} className="space-y-5">
              {state && "error" in state && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                  {state.error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
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
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
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

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowResetForm(true)}
                className="flex max-sm:min-h-11 w-full items-center justify-center rounded-md px-4 text-sm text-accent transition-colors hover:text-accent-hover"
              >
                Забыли пароль?
              </button>
            </div>
          </>
        )}

        <p className="mt-6 text-center text-xs text-text-secondary">
          Нет аккаунта? Обратитесь к администратору.
        </p>
      </div>

      <Link
        href="/"
        className="mt-6 flex max-sm:min-h-11 items-center justify-center rounded-md px-4 text-sm text-text-secondary transition-colors hover:text-foreground"
      >
        &larr; На главную
      </Link>
    </div>
  );
}

/** Форма запроса сброса пароля администратору */
function ResetForm({ onBack }: { onBack: () => void }) {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, null);

  return (
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
        <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="reset-email"
          name="email"
          type="email"
          placeholder="your@email.com"
          required
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 w-full items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Отправка..." : "Отправить запрос"}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="flex max-sm:min-h-11 w-full items-center justify-center rounded-md px-4 text-sm text-text-secondary transition-colors hover:text-foreground"
        >
          &larr; Назад к входу
        </button>
      </div>
    </form>
  );
}
