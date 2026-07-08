/*
 * WarehouseDashboard — приёмка товаров на склад.
 * Две вкладки/секции:
 * 1. Приёмка — заявки со статусом SHIPPED для отметки RECEIVED (warehouseMode)
 * 2. Выполнение заявок — просмотр всех заявок со стадиями, без возможности изменять (readOnly)
 */
"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OrderStatusTable } from "./OrderStatusTable";

export function WarehouseDashboard() {
  const [tab, setTab] = useState<"reception" | "overview">("reception");
  const [notifStatus, setNotifStatus] = useState<NotificationPermission | "loading">("loading");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifStatus(Notification.permission);
    }
  }, []);

  function requestNotif() {
    if (!("Notification" in window)) return;
    Notification.requestPermission().then(setNotifStatus);
  }

  function testNotif() {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("📦 Тест уведомления", {
        body: "Если вы это видите — уведомления работают!",
      });
    }
  }

  function forceCheck() {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  }

  return (
    <div className="space-y-4">
      {/* Блок статуса уведомлений */}
      {"Notification" in window && notifStatus !== "loading" && notifStatus !== "granted" && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-800 dark:bg-amber-950">
          <span className="text-amber-800 dark:text-amber-200">
            🔔 Разрешите уведомления, чтобы получать оповещения о новых поставках
          </span>
          <button
            onClick={requestNotif}
            className="ml-3 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700 max-sm:min-h-11"
          >
            Разрешить
          </button>
        </div>
      )}

      {notifStatus === "granted" && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm dark:border-green-800 dark:bg-green-950">
          <span className="text-green-700 dark:text-green-300">
            ✅ Уведомления включены
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={forceCheck}
              className="rounded-md bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-secondary max-sm:min-h-11"
            >
              Проверить поставки
            </button>
            <button
              onClick={testNotif}
              className="rounded-md bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-secondary max-sm:min-h-11"
            >
              Тест
            </button>
          </div>
        </div>
      )}

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
