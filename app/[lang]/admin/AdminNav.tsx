/*
 * Навигация админ-панели: табы с активным состоянием и бейджем запросов.
 * Клиентский компонент (usePathname).
 */
"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function AdminNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  const t = useTranslations("admin");

  const tabs = [
    { href: "/admin", label: t("nav.users") },
    { href: "/admin/reset-requests", label: t("nav.resetRequests") },
    { href: "/admin/orders", label: t("nav.orders") },
    { href: "/admin/archive", label: t("nav.archive") },
  ];

  return (
    <nav className="flex items-center gap-1 rounded-lg bg-surface-secondary p-1">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors max-sm:min-h-11 max-sm:px-4 ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-text-secondary hover:bg-surface hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.href === "/admin/reset-requests" && pendingCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
