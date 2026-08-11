/*
 * KitchenDashboard — дашборд «Кухня» (вкладка в дашборде снабжения).
 *
 * Две внутренние вкладки:
 * - «Меню» — планировщик недельного меню (MenuPlanner)
 * - «Пропуски» — пропуска ввоза/вывоза на каждый день недели (KitchenPasses)
 *
 * Обе вкладки оборачиваются в KitchenWeekProvider: общее состояние недели
 * (startDate/selectedDays/menu/visibleDays/dishes). DashboardTabs держит панели
 * смонтированными, поэтому переключение вкладок не теряет ни состояние форм,
 * ни localStorage-данные.
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
            Планирование недельного меню и пропусков
          </p>
        </div>
      </div>

      <KitchenWeekProvider>
        <DashboardTabs
          tabs={[
            { role: "menu", label: "Меню", icon: "🍽️" },
            { role: "passes", label: "Пропуски", icon: "🚛" },
          ]}
        >
          <MenuPlanner />
          <KitchenPasses />
        </DashboardTabs>
      </KitchenWeekProvider>
    </section>
  );
}
