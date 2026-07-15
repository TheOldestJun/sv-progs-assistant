/*
 * ThemeSwitcher — переключатель темы (light / dark / system).
 * Три кнопки с иконками, активная подсвечивается primary-цветом.
 * Использует useTheme из ThemeProvider.
 */
"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "./ThemeProvider";

// Иконки и подписи для трёх режимов темы
const icons: Record<string, string> = {
  light: "\u2600",
  dark: "\u263E",
  system: "\u25D1",
};

const order: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");

  const labels: Record<string, string> = {
    light: t("light"),
    dark: t("dark"),
    system: t("system"),
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
      {order.map((th) => (
        <button
          key={th}
          onClick={() => setTheme(th)}
          title={labels[th]}
          className={
            "flex size-9 max-sm:min-h-11 max-sm:min-w-11 items-center justify-center rounded-md text-sm transition-colors " +
            (theme === th
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-text-secondary hover:text-foreground hover:bg-surface-secondary")
          }
        >
          {icons[th]}
        </button>
      ))}
    </div>
  );
}
