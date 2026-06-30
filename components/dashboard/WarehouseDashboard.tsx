/*
 * WarehouseDashboard — приёмка товаров на склад.
 * Показывает заявки со статусом SHIPPED для отметки RECEIVED.
 */
"use client";

import { OrderStatusTable } from "./OrderStatusTable";

export function WarehouseDashboard() {
  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-6 flex items-center gap-3">
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

      <OrderStatusTable warehouseMode />
    </section>
  );
}
