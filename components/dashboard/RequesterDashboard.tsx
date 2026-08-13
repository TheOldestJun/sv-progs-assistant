/*
 * RequesterDashboard — дашборд заявителя (роль REQUESTER).
 * Вкладки:
 * - «Мои заявки» — таблица собственных заявок (только просмотр)
 * - «Новая заявка» — общая форма RequestForm (без выбора заявителя, привязывается автоматически)
 * - «Создать пропуски» — форма пропусков
 * API автоматически определяет заявителя по сессии (userId → Requester).
 */
"use client";

import { OrderStatusTable } from "./OrderStatusTable";
import { DashboardTabs } from "./DashboardTabs";
import { PassForm } from "@/components/passes/PassForm";
import { RequestForm } from "@/components/orders/RequestForm";

export function RequesterDashboard() {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <span className="text-2xl">📝</span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Панель заказчика
          </h2>
          <p className="text-sm text-text-secondary">
            Создание и отслеживание заявок на снабжение
          </p>
        </div>
      </div>

      <DashboardTabs
        tabs={[
          { role: "orders", label: "Мои заявки", icon: "📋" },
          { role: "create", label: "Новая заявка", icon: "✏️" },
          { role: "passes", label: "Создать пропуски", icon: "🪪" },
        ]}
      >
        <div>
          <OrderStatusTable requesterMode />
        </div>

        <RequestForm showRequester={false} excelButton />

        <PassForm />
      </DashboardTabs>
    </section>
  );
}
