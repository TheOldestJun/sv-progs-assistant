/*
 * MenuPlanner — планировщик недельного меню (вкладка «Кухня»).
 *
 * Перенесено из my-ai-helper (MenuPlanner.jsx) на наш стек:
 * - Autocomplete (наш, синхронный onCreate → optimistic-паттерн)
 * - DatePicker (строковые даты YYYY-MM-DD)
 * - Dishes API (GET/POST/PATCH /api/dishes)
 * - Создание блюда «на лету» прямо из автокомплита (как везде: только название)
 * - Меню и выбор дней хранятся в localStorage (weeklyMenu / selectedDays)
 * - Экспорт в PDF через html2pdf.js (lib/exportMenuPDF.ts)
 */
"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Autocomplete, type AutocompleteItem } from "@/components/ui/Autocomplete";
import { DatePicker } from "@/components/ui/DatePicker";
import { useToast } from "@/components/ui/Toast";
import { useDishes, useCreateDish, useUpdateDish, type Dish } from "@/hooks/useDishes";
import { exportMenuPDF, type MenuDay } from "@/lib/exportMenuPDF";

type DishType = Dish["type"];

const WEEKDAYS: { id: string; label: string }[] = [
  { id: "monday", label: "Понедельник" },
  { id: "tuesday", label: "Вторник" },
  { id: "wednesday", label: "Среда" },
  { id: "thursday", label: "Четверг" },
  { id: "friday", label: "Пятница" },
  { id: "saturday", label: "Суббота" },
  { id: "sunday", label: "Воскресенье" },
];
const DEFAULT_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const MEAL_TYPES: { id: string; label: string; dishType: DishType }[] = [
  { id: "soup", label: "Первое блюдо", dishType: "SOUP" },
  { id: "garnish", label: "Гарнир", dishType: "GARNISH" },
  { id: "meat", label: "Мясное блюдо", dishType: "MEAT" },
  { id: "salad", label: "Салат", dishType: "SALAD" },
  { id: "bakery", label: "Выпечка", dishType: "BAKERY" },
  { id: "drink", label: "Напиток", dishType: "DRINK" },
];

/** Меню в localStorage: { [dayId]: { [mealTypeId]: [dishId] } } */
type MenuShape = Record<string, Record<string, string[]>>;

function formatISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Понедельник текущей недели (локальная дата) */
function mondayOfWeek(d: Date): string {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  return formatISO(monday);
}

function addDays(iso: string, n: number): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d + n);
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Оставляет в меню только блюда, присутствующие в справочнике */
function sanitizeMenu(raw: MenuShape, dishes: Dish[]): MenuShape {
  const valid = new Set(dishes.map((d) => d.id));
  const result: MenuShape = {};
  for (const [dayId, meals] of Object.entries(raw)) {
    const cleanMeals: Record<string, string[]> = {};
    for (const [mealId, dishIds] of Object.entries(meals)) {
      const kept = (Array.isArray(dishIds) ? dishIds : []).filter((id) => valid.has(id));
      if (kept.length > 0) cleanMeals[mealId] = kept;
    }
    if (Object.keys(cleanMeals).length > 0) result[dayId] = cleanMeals;
  }
  return result;
}

export function MenuPlanner() {
  const { data, isLoading } = useDishes();
  const createDish = useCreateDish();
  const updateDish = useUpdateDish();
  const { showToast } = useToast();

  const dishes = data?.dishes ?? [];

  const [startDate, setStartDate] = useState<string>(() => mondayOfWeek(new Date()));
  // SSR-safe: состояние стартует с fallback, а localStorage подтягивается в
  // useEffect на маунте — иначе гидратация ломается (сервер/клиент расхождение)
  const [selectedDays, setSelectedDays] = useState<string[]>(DEFAULT_DAYS);
  const [menu, setMenu] = useState<MenuShape>({});

  // Черновики цен (локальный ввод до сохранения)
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});

  const prevDishesRef = useRef<Dish[] | null>(null);

  // Гидратация из localStorage после монтирования (SSR-safe)
  useEffect(() => {
    setSelectedDays(loadJSON("selectedDays", DEFAULT_DAYS));
    setMenu(loadJSON("weeklyMenu", {}));
  }, []);

  // Персист меню и дней
  useEffect(() => {
    try {
      window.localStorage.setItem("weeklyMenu", JSON.stringify(menu));
    } catch {
      /* noop */
    }
  }, [menu]);

  useEffect(() => {
    try {
      window.localStorage.setItem("selectedDays", JSON.stringify(selectedDays));
    } catch {
      /* noop */
    }
  }, [selectedDays]);

  // Санация меню при загрузке блюд
  useEffect(() => {
    if (prevDishesRef.current === null && dishes.length > 0) {
      const cleaned = sanitizeMenu(menu, dishes);
      if (JSON.stringify(cleaned) !== JSON.stringify(menu)) {
        setMenu(cleaned);
      }
      prevDishesRef.current = dishes;
    }
  }, [dishes, menu]);

  const dishById = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);

  const visibleDays: MenuDay[] = useMemo(() => {
    const days: MenuDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(startDate, i);
      const weekdayIdx = (date.getDay() + 6) % 7;
      const weekday = WEEKDAYS[weekdayIdx];
      if (!selectedDays.includes(weekday.id)) continue;
      days.push({
        id: weekday.id,
        label: weekday.label,
        dateStr: date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }),
        dateISO: formatISO(date),
      });
    }
    return days;
  }, [startDate, selectedDays]);

  function toggleDay(dayId: string) {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId],
    );
  }

  function handleAddDish(dayId: string, mealTypeId: string, dishId: string) {
    setMenu((prev) => ({
      ...prev,
      [dayId]: { ...(prev[dayId] ?? {}), [mealTypeId]: [dishId] },
    }));
  }

  function handleRemoveDish(dayId: string, mealTypeId: string, dishId: string) {
    setMenu((prev) => {
      const meals = prev[dayId];
      if (!meals) return prev;
      const kept = (meals[mealTypeId] ?? []).filter((id) => id !== dishId);
      const nextMeals = { ...meals };
      if (kept.length > 0) nextMeals[mealTypeId] = kept;
      else delete nextMeals[mealTypeId];
      const next = { ...prev, [dayId]: nextMeals };
      if (Object.keys(nextMeals).length === 0) delete next[dayId];
      return next;
    });
  }

  function handleCellSelect(item: AutocompleteItem, dayId: string, mealTypeId: string) {
    handleAddDish(dayId, mealTypeId, item.id);
  }

  /*
   * Создание блюда «на лету» прямо из автокомплита (как везде в приложении):
   * печатаешь название → «Добавить ...» → optimistic-id в ячейке → POST /api/dishes
   * → после ответа optimistic-id заменяется на реальный из БД.
   * Цена на этом шаге не запрашивается — ставится 0 и правится потом в ячейке.
   */
  function handleDishCreate(title: string, dayId: string, mealTypeId: string): AutocompleteItem {
    const optimisticId = `optimistic-${Date.now()}`;
    const meal = MEAL_TYPES.find((m) => m.id === mealTypeId)!;
    handleAddDish(dayId, mealTypeId, optimisticId);
    createDish.mutate(
      { name: title, type: meal.dishType },
      {
        onSuccess: (res) => {
          showToast(`Блюдо «${res.dish.name}» создано`, "success");
          setMenu((prev) => {
            const day = prev[dayId];
            const mealIds = day?.[mealTypeId];
            if (!day || !mealIds) return prev;
            return {
              ...prev,
              [dayId]: {
                ...day,
                [mealTypeId]: mealIds.map((id) => (id === optimisticId ? res.dish.id : id)),
              },
            };
          });
        },
        onError: (err) => {
          showToast(err.message, "error");
          handleRemoveDish(dayId, mealTypeId, optimisticId);
        },
      },
    );
    return { id: optimisticId, title };
  }

  function handlePriceChange(dishId: string, value: string) {
    setPriceInputs((prev) => ({ ...prev, [dishId]: value }));
  }

  function handlePriceBlur(dishId: string) {
    const raw = priceInputs[dishId];
    if (raw === undefined) return;
    const parsed = parseFloat(raw.replace(",", "."));
    const dish = dishById.get(dishId);
    if (!dish) return;
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed !== dish.price) {
      updateDish.mutate({ id: dishId, price: parsed });
    }
    setPriceInputs((prev) => {
      const next = { ...prev };
      delete next[dishId];
      return next;
    });
  }

  function handlePriceKeyDown(e: React.KeyboardEvent, dishId: string) {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.currentTarget as HTMLInputElement).blur();
    }
  }

  async function handleExportPDF() {
    try {
      await exportMenuPDF({ visibleDays, menu, dishes });
      showToast("Меню экспортировано в PDF", "success");
    } catch {
      showToast("Ошибка при создании PDF", "error");
    }
  }

  function handleSave() {
    showToast("Меню сохранено", "success");
  }

  return (
    <div className="space-y-5">
      {/* Шапка: неделя + действия */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-72">
          <DatePicker label="Начало недели" value={startDate} onChange={setStartDate} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary max-sm:min-h-11"
          >
            Сохранить
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={visibleDays.length === 0}
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 max-sm:min-h-11"
          >
            Экспорт в PDF
          </button>
        </div>
      </div>

      {/* Выбор дней недели */}
      <div className="flex flex-wrap gap-2">
        {WEEKDAYS.slice(0, 5).map((day) => {
          const active = selectedDays.includes(day.id);
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => toggleDay(day.id)}
              aria-pressed={active}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors max-sm:min-h-11 ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-text-secondary hover:bg-surface-secondary"
              }`}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      {/* Таблица меню */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-0 text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-text-secondary sm:px-4">
                  Блюдо
                </th>
                {visibleDays.map((day) => (
                  <th key={day.id} className="px-3 py-2 text-left font-medium text-text-secondary sm:px-4">
                    <div className="whitespace-nowrap">{day.label}</div>
                    <div className="text-xs font-normal text-text-secondary">{day.dateStr}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MEAL_TYPES.map((meal) => (
                <tr key={meal.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-foreground sm:px-4">
                    {meal.label}
                  </td>
                  {visibleDays.map((day) => {
                    const dishId = menu[day.id]?.[meal.id]?.[0];
                    const dish = dishId ? dishById.get(dishId) : undefined;
                    const options: AutocompleteItem[] = dishes
                      .filter((d) => d.type === meal.dishType)
                      .map((d) => ({ id: d.id, title: d.name }));
                    const value = dish ? { id: dish.id, title: dish.name } : null;
                    return (
                      <td key={day.id} className="px-3 py-2 sm:px-4">
                        <Autocomplete
                          items={options}
                          value={value}
                          placeholder="Выбрать..."
                          onSelect={(item) => handleCellSelect(item, day.id, meal.id)}
                          onCreate={(title) => handleDishCreate(title, day.id, meal.id)}
                          inputClassName="px-2 py-1.5 text-xs max-sm:py-2 max-sm:min-h-9"
                        />
                        {dish && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={priceInputs[dish.id] ?? String(dish.price)}
                              onChange={(e) => handlePriceChange(dish.id, e.target.value)}
                              onBlur={() => handlePriceBlur(dish.id)}
                              onKeyDown={(e) => handlePriceKeyDown(e, dish.id)}
                              aria-label={`Цена блюда ${dish.name}`}
                              className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary max-sm:min-h-9"
                            />
                            <span className="text-xs text-text-secondary">₴</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDish(day.id, meal.id, dish.id)}
                              title={`Убрать «${dish.name}»`}
                              className="flex size-6 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400 max-sm:size-9"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
