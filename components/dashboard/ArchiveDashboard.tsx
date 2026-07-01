/*
 * ArchiveDashboard — вкладка архива удалённых заявок.
 */
"use client";

import { ArchiveTable } from "./ArchiveTable";

export function ArchiveDashboard() {
  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-2xl">🗃️</span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Архив заявок
          </h2>
          <p className="text-sm text-text-secondary">
            Завершённые и удалённые заявки (хранятся 2 года)
          </p>
        </div>
      </div>

      <ArchiveTable />
    </section>
  );
}
