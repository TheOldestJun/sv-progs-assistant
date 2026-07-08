/*
 * DashboardClient — клиентская обёртка для /dashboard.
 * Монтирует useWarehouseNotifications, который работает
 * независимо от активной вкладки.
 */
"use client";

import { useWarehouseNotifications } from "@/hooks/useWarehouseNotifications";

export function DashboardClient({
  children,
  isWarehouse,
}: {
  children: React.ReactNode;
  isWarehouse: boolean;
}) {
  useWarehouseNotifications(isWarehouse);
  return <>{children}</>;
}
