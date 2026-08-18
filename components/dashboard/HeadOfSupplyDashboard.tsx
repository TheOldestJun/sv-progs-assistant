/*
 * HeadOfSupplyDashboard — дашборд начальника снабжения.
 * Вкладки:
 * - «Выполнение заявок» — таблица с управлением статусами
 * - «Новая заявка» — форма RequestForm (с выбором заявителя)
 * - «Создать пропуски» — пропуска
 * - «Кухня» — кухонный дашборд
 * - «Тендеры» — тендерные процедуры (мок)
 * Требуется роль HEAD_OF_SUPPLY.
 */
"use client";

import { OrderStatusTable } from "./OrderStatusTable";
import { DashboardTabs } from "./DashboardTabs";
import { PassForm } from "@/components/passes/PassForm";
import { KitchenDashboard } from "./KitchenDashboard";
import { RequestForm } from "@/components/orders/RequestForm";
import { TendersTab } from "./TendersTab";

export function HeadOfSupplyDashboard() {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <span className="text-2xl">📋</span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Панель начальника снабжения
          </h2>
          <p className="text-sm text-text-secondary">
            Создание и выполнение заявок на снабжение
          </p>
        </div>
      </div>

      <DashboardTabs
        tabs={[
          { role: "orders", label: "Выполнение заявок", icon: "📋" },
          { role: "create", label: "Новая заявка", icon: "✏️" },
          { role: "passes", label: "Создать пропуски", icon: "🪪" },
          { role: "kitchen", label: "Кухня", icon: "🍳" },
          { role: "tenders", label: "Тендеры", icon: "🏛️" },
        ]}
      >
        <div>
          <OrderStatusTable showDirectorateOptions passSelectionStatuses={["SHIPPED"]} passType="import" allowStatusRollback />
        </div>

        <RequestForm />

        <PassForm />

        <KitchenDashboard />

        <TendersTab />
      </DashboardTabs>
    </section>
  );
}
