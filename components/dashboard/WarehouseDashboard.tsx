/*
 * WarehouseDashboard — приёмка товаров на склад.
 * Две вкладки/секции:
 * 1. Приёмка — заявки со статусом SHIPPED для отметки RECEIVED (warehouseMode)
 * 2. Выполнение заявок — просмотр всех заявок со стадиями, без возможности изменять (readOnly)
 */
"use client";

import { useState } from "react";
import { OrderStatusTable } from "./OrderStatusTable";

export function WarehouseDashboard() {
  const [tab, setTab] = useState<"reception" | "overview">("reception");

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

        {/* Внутренние табы */}
        <div className="-mt-2 mb-6 border-b border-border">
          <nav className="-mb-px flex gap-1" role="tablist">
            <button
              role="tab"
              aria-selected={tab === "reception"}
              onClick={() => setTab("reception")}
              className={
                "rounded-t-lg px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:py-2.5 sm:text-sm " +
                (tab === "reception"
                  ? "border-b-2 border-accent-blue text-accent-blue"
                  : "border-b-2 border-transparent text-text-secondary hover:border-border hover:text-foreground")
              }
            >
              📥 Приёмка
            </button>
            <button
              role="tab"
              aria-selected={tab === "overview"}
              onClick={() => setTab("overview")}
              className={
                "rounded-t-lg px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:py-2.5 sm:text-sm " +
                (tab === "overview"
                  ? "border-b-2 border-accent-blue text-accent-blue"
                  : "border-b-2 border-transparent text-text-secondary hover:border-border hover:text-foreground")
              }
            >
              📋 Выполнение заявок
            </button>
          </nav>
        </div>

        {tab === "reception" ? (
          <OrderStatusTable warehouseMode />
        ) : (
          <OrderStatusTable readOnly />
        )}
      </section>
    </div>
  );
}
