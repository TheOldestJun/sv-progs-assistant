/*
 * WarehouseDashboard — приёмка товаров на склад.
 * Четыре вкладки:
 * 1. Приёмка — заявки со статусом SHIPPED для отметки RECEIVED (warehouseMode)
 * 2. Выполнение заявок — просмотр всех заявок (readOnly)
 * 3. Ожидание подтверждения — ссылки для заявителей
 * 4. Пропуска — создание пропусков
 */
"use client";

import { OrderStatusTable } from "./OrderStatusTable";
import { DashboardTabs } from "./DashboardTabs";
import { PassForm } from "@/components/passes/PassForm";
import { ConfirmLinksTab } from "./ConfirmLinksTab";

export function WarehouseDashboard() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-3 sm:mb-6">
          <span className="text-2xl">🏭</span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Приёмка товаров
            </h2>
            <p className="text-sm text-text-secondary">
              Подтвердите получение товаров на склад
            </p>
          </div>
        </div>

        <DashboardTabs
          tabs={[
            { role: "reception", label: "Приёмка", icon: "📥" },
            { role: "overview", label: "Выполнение заявок", icon: "📋" },
            { role: "confirm-links", label: "Ожидание подтверждения", icon: "🔗" },
            { role: "passes", label: "Создать пропуски", icon: "🪪" },
          ]}
        >
          <OrderStatusTable warehouseMode />

          <OrderStatusTable readOnly />

          <ConfirmLinksTab />

          <PassForm />
        </DashboardTabs>
      </section>
    </div>
  );
}
