/*
 * KitchenDashboard — дашборд «Кухня» (вкладка в дашборде снабжения).
 *
 * Содержит планировщик недельного меню (MenuPlanner).
 * Оборачивается в KitchenWeekProvider: общее состояние недели
 * (startDate/selectedDays/menu/visibleDays/dishes).
 */
"use client";

import { KitchenWeekProvider } from "@/components/dashboard/kitchen/kitchenWeek";
import { MenuPlanner } from "@/components/dashboard/kitchen/MenuPlanner";

export function KitchenDashboard() {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <span className="text-2xl">🍳</span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Кухня
          </h2>
          <p className="text-sm text-text-secondary">
            Планирование недельного меню
          </p>
        </div>
      </div>

      <KitchenWeekProvider>
        <MenuPlanner />
      </KitchenWeekProvider>
    </section>
  );
}
