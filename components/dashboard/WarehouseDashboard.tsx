/*
 * WarehouseDashboard — приёмка товаров на склад.
 * Три вкладки:
 * 1. Приёмка — заявки со статусом SHIPPED для отметки RECEIVED (warehouseMode)
 * 2. Выполнение заявок — просмотр всех заявок (readOnly)
 * 3. Пропуска — создание пропусков
 */
"use client";

import { useTranslations } from "next-intl";
import { OrderStatusTable } from "./OrderStatusTable";
import { DashboardTabs } from "./DashboardTabs";
import { PassForm } from "@/components/passes/PassForm";

export function WarehouseDashboard() {
  const tPage = useTranslations("dashboard.warehouse");
  const tTabs = useTranslations("dashboard.tabs");

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-3 sm:mb-6">
          <span className="text-2xl">🏭</span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {tPage("title")}
            </h2>
            <p className="text-sm text-text-secondary">
              {tPage("subtitle")}
            </p>
          </div>
        </div>

        <DashboardTabs
          tabs={[
            { role: "reception", label: tTabs("receiving"), icon: "📥" },
            { role: "overview", label: tTabs("fulfillment"), icon: "📋" },
            { role: "passes", label: tTabs("passes"), icon: "🪪" },
          ]}
        >
          <OrderStatusTable warehouseMode />

          <OrderStatusTable readOnly />

          <PassForm />
        </DashboardTabs>
      </section>
    </div>
  );
}
