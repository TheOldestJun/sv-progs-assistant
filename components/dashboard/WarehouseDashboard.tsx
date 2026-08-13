/*
 * WarehouseDashboard — приёмка товаров на склад + создание заявок.
 * Пять вкладок:
 * 1. Приёмка — заявки со статусом SHIPPED для отметки RECEIVED (warehouseMode)
 * 2. Выполнение заявок — просмотр всех заявок (readOnly)
 * 3. Новая заявка — общая форма RequestForm (с выбором заявителя)
 * 4. Ожидание подтверждения — ссылки для заявителей
 * 5. Пропуска — создание пропусков
 */
"use client";

import { OrderStatusTable } from "./OrderStatusTable";
import { DashboardTabs } from "./DashboardTabs";
import { PassForm } from "@/components/passes/PassForm";
import { ConfirmLinksTab } from "./ConfirmLinksTab";
import { RequestForm } from "@/components/orders/RequestForm";

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
            { role: "create", label: "Новая заявка", icon: "✏️" },
            { role: "confirm-links", label: "Ожидание подтверждения", icon: "🔗" },
            { role: "passes", label: "Создать пропуски", icon: "🪪" },
          ]}
        >
          <OrderStatusTable warehouseMode passSelectionStatuses={["RECEIVED"]} passType="import_with_export" />

          <OrderStatusTable readOnly />

          <RequestForm />

          <ConfirmLinksTab />

          <PassForm />
        </DashboardTabs>
      </section>
    </div>
  );
}
