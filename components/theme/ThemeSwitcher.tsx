/*
 * ThemeSwitcher — переключатель темы (light / dark / system).
 * Три кнопки с иконками, активная подсвечивается primary-цветом.
 * Использует useTheme из ThemeProvider.
 */
"use client";

import { useTheme } from "./ThemeProvider";

// Иконки и подписи для трёх режимов темы
const icons: Record<string, string> = {
  light: "\u2600",
  dark: "\u263E",
  system: "\u25D1",
};

const labels: Record<string, string> = {
  light: "\u0421\u0432\u0435\u0442\u043B\u0430\u044F",
  dark: "\u0422\u0435\u043C\u043D\u0430\u044F",
  system: "\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u0430\u044F",
};

const order: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];

/*
 * ThemeSwitcher — переключатель между светлой, тёмной и системной темой.
 * Использует useTheme из ThemeProvider.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
      {order.map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          title={labels[t]}
          className={
            "flex size-7 items-center justify-center rounded-md text-sm transition-colors " +
            (theme === t
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-text-secondary hover:text-foreground hover:bg-surface-secondary")
          }
        >
          {icons[t]}
        </button>
      ))}
    </div>
  );
}
