/*
 * Форма создания первого администратора.
 * Используется на /setup.
 */
"use client";

import { useActionState } from "react";
import { setupAction } from "@/app/lib/auth";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

export function SetupForm() {
  const t = useTranslations("auth.setup");
  const tc = useTranslations("common");
  const [state, formAction, isPending] = useActionState(setupAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state && "success" in state) {
      router.push("/login");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-5">
      {state && "error" in state && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {state.error}
        </div>
      )}

      {state && "success" in state && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
          {tc("name")}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder={t("namePlaceholder")}
          required
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
          {tc("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="admin@example.com"
          required
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
          {tc("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
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
  );
}
