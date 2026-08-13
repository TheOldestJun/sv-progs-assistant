/*
 * KitchenDashboard — дашборд «Кухня» (вкладка в дашбордах снабжения).
 *
 * Две подвкладки:
 * - «Планирование недельного меню» — планировщик меню (MenuPlanner)
 * - «Создание пропусков» — копия недельного меню с порциями и печать (KitchenPasses)
 *
 * Оборачивается в KitchenWeekProvider: общее состояние недели
 * (startDate/selectedDays/menu/visibleDays/dishes/breadPrices) — благодаря чему
 * меню автоматически доступно во вкладке пропусков.
 */
"use client";

import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { KitchenWeekProvider } from "@/components/dashboard/kitchen/kitchenWeek";
import { MenuPlanner } from "@/components/dashboard/kitchen/MenuPlanner";
import { KitchenPasses } from "@/components/dashboard/kitchen/KitchenPasses";

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
            Планирование недельного меню и создание пропусков
          </p>
        </div>
      </div>

      <KitchenWeekProvider>
        <DashboardTabs
          tabs={[
            { role: "menu", label: "Планирование недельного меню", icon: "🍽️" },
            { role: "passes", label: "Создание пропусков", icon: "🚛" },
          ]}
        >
          <MenuPlanner />
          <KitchenPasses />
        </DashboardTabs>
      </KitchenWeekProvider>
    </section>
  );
}
