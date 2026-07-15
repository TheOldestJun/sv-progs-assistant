/*
 * ArchiveDashboard — вкладка архива удалённых заявок.
 */
"use client";

import { useTranslations } from "next-intl";
import { ArchiveTable } from "./ArchiveTable";

export function ArchiveDashboard() {
  const tPage = useTranslations("dashboard.archive");

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <span className="text-2xl">🗃️</span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {tPage("title")}
          </h2>
          <p className="text-sm text-text-secondary">
            {tPage("subtitle")}
          </p>
        </div>
      </div>

      <ArchiveTable />
    </section>
  );
}
