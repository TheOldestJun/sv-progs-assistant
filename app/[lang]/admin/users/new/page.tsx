/*
 * Страница создания нового пользователя (только ADMIN).
 * Роли выбираются чекбоксами (можно выбрать несколько).
 * При успехе показывает toast и редиректит на список.
 */
"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createUserAction } from "@/app/lib/auth";
import { useToast } from "@/components/ui/Toast";

const allRoles = ["ADMIN", "HEAD_OF_SUPPLY", "SUPPLY_DEPT", "WAREHOUSE", "REQUESTER"];

export default function NewUserPage() {
  const [state, formAction, isPending] = useActionState(createUserAction, null);
  const router = useRouter();
  const { showToast } = useToast();
  const t = useTranslations("common");
  const tRoles = useTranslations("roles");
  const tNewUser = useTranslations("admin.newUser");

  useEffect(() => {
    if (state && "success" in state) {
      showToast(state.message, "success");
      router.push("/admin");
    }
  }, [state, showToast, router]);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-text-secondary transition-colors hover:text-foreground"
        >
          {t("backToList")}
        </Link>
        <h2 className="mt-2 text-xl font-semibold text-foreground">
          {tNewUser("title")}
        </h2>
      </div>

      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-sm">
        <form action={formAction} className="space-y-4">
          {state && "error" in state && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              {state.error}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t("name")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t("email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t("password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-foreground">
              {t("roles")}
            </legend>
            <div className="space-y-2">
              {allRoles.map((role) => (
                <label
                  key={role}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    name="roles"
                    value={role}
                    className="size-4 accent-primary"
                  />
                  {tRoles(role)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? t("creating") : t("create")}
            </button>
            <Link
              href="/admin"
              className="inline-flex h-10 items-center rounded-lg border border-border px-6 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-foreground"
            >
              {t("cancel")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
