/*
 * SupplyDeptDashboard — вкладка отдела снабжения.
 * Показывает таблицу всех заявок с управлением статусами.
 */
"use client";

import { OrderStatusTable } from "./OrderStatusTable";

export function SupplyDeptDashboard() {
  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-2xl">📦</span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Отдел снабжения
          </h2>
          <p className="text-sm text-text-secondary">
            Просмотр и выполнение заявок на снабжение
          </p>
        </div>
      </div>

      <OrderStatusTable />
    </section>
  );
}
