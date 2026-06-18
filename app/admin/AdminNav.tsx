/*
 * Навигация админ-панели: табы с активным состоянием и бейджем запросов.
 * Клиентский компонент (usePathname).
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Пользователи" },
  { href: "/admin/reset-requests", label: "Запросы сброса" },
];

export function AdminNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 rounded-lg bg-surface-secondary p-1">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
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
