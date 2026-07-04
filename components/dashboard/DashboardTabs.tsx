/*
 * DashboardTabs — клиентский компонент с табами для дашборда.
 * Принимает массив TabInfo (role, label, icon) и children-элементы.
 * Активный таб подсвечивается border-bottom accent-цветом.
 * Используется на /dashboard когда у пользователя несколько ролей.
 */
"use client";

import { Children, isValidElement, useState } from "react";

interface TabInfo {
  role: string;
  label: string;
  icon: string;
}

export function DashboardTabs({
  tabs,
  children,
}: {
  tabs: TabInfo[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <div>
      {/* Tab bar */}
      <div className="-mt-2 mb-6 border-b border-border">
        <nav className="-mb-px flex gap-1 overflow-x-auto" role="tablist">
          {tabs.map((tab, i) => (
            <button
              key={tab.role}
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={
                "flex items-center gap-1 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm " +
                (i === active
                  ? "border-b-2 border-accent-blue text-accent-blue"
                  : "border-b-2 border-transparent text-text-secondary hover:border-border hover:text-foreground")
              }
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Active tab content */}
      <div role="tabpanel">{items[active] ?? items[0]}</div>
    </div>
  );
}
