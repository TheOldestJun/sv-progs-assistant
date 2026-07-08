/*
 * WarehouseDashboard — приёмка товаров на склад.
 * Две вкладки/секции:
 * 1. Приёмка — заявки со статусом SHIPPED для отметки RECEIVED (warehouseMode)
 * 2. Выполнение заявок — просмотр всех заявок со стадиями, без возможности изменять (readOnly)
 */
"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OrderStatusTable } from "./OrderStatusTable";
import { useToast } from "@/components/ui/Toast";

export function WarehouseDashboard() {
  const [tab, setTab] = useState<"reception" | "overview">("reception");
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  async function forceCheck() {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    try {
      const [meRes, ordersRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/orders"),
      ]);
      if (!meRes.ok || !ordersRes.ok) return;
      const me = await meRes.json() as { name: string };
      const orders = await ordersRes.json() as { items: { status: string }[]; requester: { name: string } }[];
      const groups = new Map<string, number>();
      for (const order of orders) {
        let shipped = 0;
        for (const item of order.items || []) {
          if (item.status === "SHIPPED") shipped++;
        }
        if (shipped > 0) {
          const name = order.requester.name;
          groups.set(name, (groups.get(name) || 0) + shipped);
        }
      }
      if (groups.size === 0) return;
      const list = [...groups.entries()].map(([name, count]) => `${name} (${count})`).join(", ");
      showToast(`${me.name.split(" ")[0]}, приехало для ${list}?`, "info", true);
    } catch {
      showToast("Проверьте поставки 📦", "info", true);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
        onClick={forceCheck}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover max-sm:min-h-11"
      >
        🔍 Проверить поставки
      </button>
      </div>

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
