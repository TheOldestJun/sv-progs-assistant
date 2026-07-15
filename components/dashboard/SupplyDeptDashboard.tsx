/*
 * SupplyDeptDashboard — вкладка отдела снабжения.
 * Три вкладки:
 * - «Выполнение заявок» — таблица с управлением статусами
 * - «Пропуска» — создание пропусков
 */
"use client";

import { OrderStatusTable } from "./OrderStatusTable";
import { DashboardTabs } from "./DashboardTabs";
import { PassForm } from "@/components/passes/PassForm";

export function SupplyDeptDashboard() {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
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

      <DashboardTabs
        tabs={[
          { role: "orders", label: "Выполнение заявок", icon: "📋" },
          { role: "passes", label: "Создать пропуски", icon: "🪪" },
        ]}
      >
        <OrderStatusTable />

        <PassForm />
      </DashboardTabs>
    </section>
  );
}
