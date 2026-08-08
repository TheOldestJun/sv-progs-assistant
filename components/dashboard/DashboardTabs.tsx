/*
 * DashboardTabs — клиентский компонент с табами для дашборда.
 * Принимает массив TabInfo (role, label, icon) и children-элементы.
 * Активный таб подсвечивается border-bottom accent-цветом.
 * Используется на /dashboard когда у пользователя несколько ролей.
 *
 * Доступность (UI-аудит M2):
 * - Навигация с клавиатуры: ←/→ — переключение табов, Home/End — первый/последний.
 * - Ровин-таб-индекс (tabindex 0/-1), aria-selected, aria-controls.
 * - Все панели остаются смонтированными (неактивные скрыты через hidden),
 *   чтобы состояние форм (введённые данные в «Новая заявка» и т.п.) не терялось
 *   при переключении между вкладками.
 */
"use client";

import { Children, isValidElement, useCallback, useState } from "react";

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

  // Клавиатурная навигация по табам: ←/→ циклически, Home/End — края.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, i: number) => {
      let next: number | null = null;
      if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      setActive(next);
      document.getElementById(`tab-${tabs[next].role}`)?.focus();
    },
    [tabs],
  );

  return (
    <div>
      {/* Tab bar */}
      <div className="-mt-2 mb-6 border-b border-border">
        <nav
          className="-mb-px flex gap-1 overflow-x-auto"
          role="tablist"
          aria-orientation="horizontal"
        >
          {tabs.map((tab, i) => (
            <button
              key={tab.role}
              id={`tab-${tab.role}`}
              role="tab"
              aria-selected={i === active}
              aria-controls={`panel-${tab.role}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={
                "flex items-center gap-1 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm max-sm:min-h-11 " +
                (i === active
                  ? "border-b-2 border-accent-blue text-accent-blue"
                  : "border-b-2 border-transparent text-text-secondary hover:border-border hover:text-foreground")
              }
            >
              <span aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Панели: все смонтированы, неактивные скрыты — состояние форм сохраняется */}
      {items.map((child, i) => {
        const tab = tabs[i];
        if (!tab) return null;
        return (
          <div
            key={tab.role}
            id={`panel-${tab.role}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.role}`}
            hidden={i !== active}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
