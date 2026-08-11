/*
 * kitchenWeek — общий контекст «недели кухни».
 *
 * Поднимает состояние недели (startDate, selectedDays, menu, visibleDays)
 * на уровень KitchenDashboard, чтобы вкладки «Меню» и «Пропуски» использовали
 * одну и ту же неделю (DashboardTabs держит панели смонтированными, но стейт
 * каждого компонента всё равно изолирован — контекст решает эту проблему).
 *
 * Хранит:
 * - startDate (ISO YYYY-MM-DD, понедельник недели)
 * - selectedDays (id дней недели, localStorage 'selectedDays')
 * - menu (MenuShape, localStorage 'weeklyMenu')
 * - dishes (useDishes + dishById)
 * - visibleDays (производное от startDate+selectedDays, 7 дней с датами)
 * - дни недели/типы приёмов пищи (WEEKDAYS / MEAL_TYPES) — общие константы
 */
"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useDishes, type Dish } from "@/hooks/useDishes";
import type { MenuDay } from "@/lib/exportMenuPDF";

type DishType = Dish["type"];

export const WEEKDAYS: { id: string; label: string }[] = [
  { id: "monday", label: "Понедельник" },
  { id: "tuesday", label: "Вторник" },
  { id: "wednesday", label: "Среда" },
  { id: "thursday", label: "Четверг" },
  { id: "friday", label: "Пятница" },
  { id: "saturday", label: "Суббота" },
  { id: "sunday", label: "Воскресенье" },
];

export const DEFAULT_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

export const MEAL_TYPES: { id: string; label: string; dishType: DishType }[] = [
  { id: "soup", label: "Первое блюдо", dishType: "SOUP" },
  { id: "garnish", label: "Гарнир", dishType: "GARNISH" },
  { id: "meat", label: "Мясное блюдо", dishType: "MEAT" },
  { id: "salad", label: "Салат", dishType: "SALAD" },
  { id: "bakery", label: "Выпечка", dishType: "BAKERY" },
  { id: "drink", label: "Напиток", dishType: "DRINK" },
];

/** Меню в localStorage: { [dayId]: { [mealTypeId]: [dishId] } } */
export type MenuShape = Record<string, Record<string, string[]>>;

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

/** id дня недели по ISO-дате (для связи пропусков с меню) */
export function weekdayIdFromISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return WEEKDAYS[(date.getDay() + 6) % 7].id;
}

interface KitchenWeekValue {
  startDate: string;
  setStartDate: (v: string) => void;
  selectedDays: string[];
  toggleDay: (dayId: string) => void;
  menu: MenuShape;
  setMenu: React.Dispatch<React.SetStateAction<MenuShape>>;
  visibleDays: MenuDay[];
  dishes: Dish[];
  dishById: Map<string, Dish>;
  isLoading: boolean;
}

const KitchenWeekContext = createContext<KitchenWeekValue | null>(null);

export function KitchenWeekProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useDishes();
  const dishes = data?.dishes ?? [];

  const [startDate, setStartDate] = useState<string>(() => mondayOfWeek(new Date()));
  // SSR-safe: состояние стартует с fallback, а localStorage подтягивается в
  // useEffect на маунте — иначе гидратация ломается (сервер/клиент расхождение)
  const [selectedDays, setSelectedDays] = useState<string[]>(DEFAULT_DAYS);
  const [menu, setMenu] = useState<MenuShape>({});

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

  const value: KitchenWeekValue = {
    startDate,
    setStartDate,
    selectedDays,
    toggleDay,
    menu,
    setMenu,
    visibleDays,
    dishes,
    dishById,
    isLoading,
  };

  return <KitchenWeekContext.Provider value={value}>{children}</KitchenWeekContext.Provider>;
}

export function useKitchenWeek(): KitchenWeekValue {
  const ctx = useContext(KitchenWeekContext);
  if (!ctx) throw new Error("useKitchenWeek must be used within KitchenWeekProvider");
  return ctx;
}
