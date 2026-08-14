/*
 * KitchenPasses — вкладка «Создание пропусков» дашборда «Кухня».
 *
 * Недельное меню автоматически копируется из KitchenWeekContext (то, что
 * запланировано во вкладке «Планирование недельного меню»). Здесь пользователь
 * задаёт количество порций для каждого блюда на каждый день и печатает пропуска.
 *
 * UI/UX только — к Excel-шаблону (IN_OUT.xlsx) пока не привязано.
 *
 * Порции хранятся в localStorage ('kitchenPortions') в виде
 * { [dayId]: { [dishId]: "100" } }.
 * Генерация пропусков — через Excel-шаблон IN_OUT.xlsx (лист KITCHEN, 5 блоков
 * по 65 строк). Заполняются дни с блюдами, для блюд ед. изм. «ПОРЦ», для хлеба «КУС».
 */
"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { exportKitchenPasses, type KitchenPassDay } from "@/lib/exportKitchenPasses";
import { useKitchenWeek, MEAL_TYPES } from "./kitchenWeek";

const STORAGE_KEY = "kitchenPortions";

/** Порции: { [dayId]: { [dishId]: "100" } } */
type PortionsShape = Record<string, Record<string, string>>;

/** id хлеба в списке порций (хлеб — постоянная строка меню, не из БД) */
const BREAD_ID = "bread";

function loadPortions(): PortionsShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PortionsShape) : {};
  } catch {
    return {};
  }
}

interface DayDish {
  /** id блюда в БД или BREAD_ID для хлеба */
  dishId: string;
  name: string;
  category: string;
}

export function KitchenPasses() {
  const { visibleDays, startDate, menu, dishById, breadPrices, isLoading } = useKitchenWeek();
  const { showToast } = useToast();

  const [portions, setPortions] = useState<PortionsShape>({});

  // SSR-safe гидратация из localStorage
  useEffect(() => {
    setPortions(loadPortions());
  }, []);

  // Персист порций
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(portions));
    } catch {
      /* noop */
    }
  }, [portions]);

  /** Блюда дня из недельного меню (по порядку MEAL_TYPES + хлеб в конце) */
  function getDayDishes(dayId: string): DayDish[] {
    const items: DayDish[] = [];
    const dayMenu = menu[dayId];

    if (dayMenu) {
      for (const meal of MEAL_TYPES) {
        const dishIds = dayMenu[meal.id];
        if (!dishIds) continue;
        for (const dishId of dishIds) {
          const dish = dishById.get(dishId);
          if (dish) {
            items.push({ dishId: dish.id, name: dish.name, category: meal.label });
          }
        }
      }
    }

    // Хлеб — постоянная строка меню (в меню есть её цена/поля)
    if (breadPrices[dayId] !== undefined) {
      items.push({ dishId: BREAD_ID, name: "ХЛІБ", category: "Хлеб" });
    }

    return items;
  }

  /** Количество порций блюда (число или 0) */
  function portionNum(dayId: string, dishId: string): number {
    const raw = portions[dayId]?.[dishId] ?? "";
    const num = parseFloat(raw.replace(",", "."));
    return !Number.isNaN(num) && num > 0 ? num : 0;
  }

  function handlePortionChange(dayId: string, dishId: string, val: string) {
    setPortions((prev) => ({
      ...prev,
      [dayId]: { ...(prev[dayId] ?? {}), [dishId]: val },
    }));
  }

  /** Проставить N порций всем блюдам одного дня */
  function setDayPortions(dayId: string, count: string) {
    const dayDishes = getDayDishes(dayId);
    if (dayDishes.length === 0) return;
    setPortions((prev) => {
      const dayState = { ...(prev[dayId] ?? {}) };
      for (const d of dayDishes) dayState[d.dishId] = count;
      return { ...prev, [dayId]: dayState };
    });
  }

  /** Экспорт пропусков в Excel: дни с блюдами (порции > 0) по порядку → 5 блоков */
  async function handleExport() {
    // Валидация: у каждого блюда дней с блюдами должно быть заполнено количество порций
    const emptyPortions: { dayLabel: string; dishName: string }[] = [];
    for (const day of visibleDays) {
      const dayDishes = getDayDishes(day.id);
      if (dayDishes.length === 0) continue;
      for (const d of dayDishes) {
        if (portionNum(day.id, d.dishId) <= 0) {
          emptyPortions.push({ dayLabel: day.label, dishName: d.name });
        }
      }
    }
    if (emptyPortions.length > 0) {
      const first = emptyPortions[0];
      showToast(
        `Заполните порции: «${first.dishName}» (${first.dayLabel})${emptyPortions.length > 1 ? ` и ещё ${emptyPortions.length - 1}` : ""}`,
        "error",
      );
      return;
    }

    const days: KitchenPassDay[] = [];
    for (const day of visibleDays) {
      const items = getDayDishes(day.id)
        .map((d) => ({
          name: d.name,
          unit: d.dishId === BREAD_ID ? "КУС" : "ПОРЦ",
          quantity: portionNum(day.id, d.dishId),
        }))
        .filter((it) => it.quantity > 0);
      if (items.length > 0) days.push({ dateISO: day.dateISO, items });
    }

    try {
      await exportKitchenPasses(days, startDate);
      showToast("Пропуска сформированы", "success");
    } catch {
      showToast("Ошибка при формировании пропусков", "error");
    }
  }

  const daysWithDishes = visibleDays.filter((day) => getDayDishes(day.id).length > 0);

  return (
    <>
      {/* Экранный интерфейс — скрывается при печати */}
      <div className="space-y-5 print:hidden">
        {/* Шапка управления */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-secondary/40 p-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              Создание пропусков
            </h3>
            <p className="text-xs text-text-secondary">
              Недельное меню скопировано автоматически. Укажите количество порций для каждого блюда.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={daysWithDishes.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 max-sm:min-h-11"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              Скачать пропуска (Excel)
            </button>
          </div>
        </div>

        {/* Состояния: загрузка / пустые дни / пустое меню / таблицы дней */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : visibleDays.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-secondary/50 p-8 text-center text-sm text-text-secondary">
            Не выбрано ни одного дня недели — отметьте рабочие дни во вкладке «Планирование недельного меню».
          </div>
        ) : daysWithDishes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-secondary/50 p-8 text-center text-sm text-text-secondary">
            В меню пока не добавлено ни одного блюда. Заполните блюда во вкладке «Планирование недельного меню» — они автоматически появятся здесь для пропусков.
          </div>
        ) : (
          <div className="space-y-5">
            {visibleDays.map((day) => {
              const dayDishes = getDayDishes(day.id);
              if (dayDishes.length === 0) return null;

              const dayTotal = dayDishes.reduce(
                (sum, d) => sum + portionNum(day.id, d.dishId),
                0,
              );

              return (
                <div
                  key={day.id}
                  className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
                >
                  {/* Шапка дня */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-secondary/40 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{day.label}</span>
                      <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-text-secondary">
                        {day.dateStr}
                      </span>
                      <span className="text-xs text-text-secondary">
                        итого {dayTotal} порц.
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="mr-1 text-xs text-text-secondary">Заполнить день:</span>
                      {["20", "22", "25"].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setDayPortions(day.id, n)}
                          className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-secondary"
                        >
                          {n} порц.
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Таблица блюд дня */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border bg-surface text-xs text-text-secondary">
                        <tr>
                          <th className="w-12 px-4 py-2 font-medium">№</th>
                          <th className="w-40 px-4 py-2 font-medium">Приём пищи</th>
                          <th className="px-4 py-2 font-medium">Наименование блюда</th>
                          <th className="w-28 px-4 py-2 font-medium">Ед. изм.</th>
                          <th className="w-32 px-4 py-2 font-medium">Порций</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dayDishes.map((d, idx) => {
                          const val = portions[day.id]?.[d.dishId] ?? "";
                          return (
                            <tr key={`${day.id}-${d.dishId}`} className="hover:bg-surface-secondary/20">
                              <td className="px-4 py-2.5 text-xs text-text-secondary">{idx + 1}</td>
                              <td className="px-4 py-2.5 text-xs font-medium text-text-secondary">
                                {d.category}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-foreground">{d.name}</td>
                              <td className="px-4 py-2.5 text-xs text-text-secondary">порц.</td>
                              <td className="px-4 py-2.5">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={val}
                                  onChange={(e) =>
                                    handlePortionChange(day.id, d.dishId, e.target.value)
                                  }
                                  placeholder="0"
                                  aria-label={`Порций: ${d.name}`}
                                  className="w-24 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary max-sm:min-h-9"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
