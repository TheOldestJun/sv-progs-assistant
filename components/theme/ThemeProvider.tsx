"use client";

/*
 * ThemeProvider — контекст темы (light / dark / system).
 * - Хранит тему в localStorage (ключ "theme")
 * - Синхронизируется с системной темой через prefers-color-scheme
 * - Предотвращает FOUC через inline-скрипт в layout.tsx
 * - useSyncExternalStore для нуль-ререндеров
 * Экспорт: ThemeProvider (обёртка), useTheme (хук)
 */
import { createContext, useContext, useCallback, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

/*
 * Возвращает true если системная тема — тёмная (prefers-color-scheme: dark).
 * Для SSR — false по умолчанию.
 */
function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/*
 * Читает сохранённую тему из localStorage.
 * Возвращает null если не сохранено (тогда используем system).
 */
function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {}
  return null;
}

/*
 * Применяет тему к DOM — добавляет/убирает класс .dark на <html>.
 */
function applyTheme(theme: Theme) {
  const dark = theme === "system" ? getSystemPrefersDark() : theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
}

/*
 * Подписка на изменение системной темы (OS-level dark mode).
 * Возвращает функцию отписки для useSyncExternalStore.
 */
function subscribeToSystem(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

/*
 * Подписка на изменение localStorage (для синхронизации между вкладками).
 */
function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolved: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/*
 * ThemeProvider:
 * - Следит за сохранённой темой (localStorage) и системной темой (prefers-color-scheme)
 * - Ресайвит (resolved): system → реальное значение из OS
 * - setTheme сохраняет в localStorage и применяет к DOM
 * - Использует useSyncExternalStore (без лишних ререндеров)
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const storedTheme = useSyncExternalStore(
    subscribeToStorage,
    getStoredTheme,
    () => null
  );

  const prefersDark = useSyncExternalStore(
    subscribeToSystem,
    getSystemPrefersDark,
    () => false
  );

  const systemTheme: "light" | "dark" = prefersDark ? "dark" : "light";

  const theme: Theme = storedTheme ?? "system";
  const resolved = theme === "system" ? systemTheme : theme;

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem("theme", t);
    } catch {}
    applyTheme(t);
    // Триггерим storage event для синхронизации других вкладок
    window.dispatchEvent(new Event("storage"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
