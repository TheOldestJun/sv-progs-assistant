/*
 * KitchenPasses — вкладка «Пропуски» дашборда «Кухня».
 *
 * Таблица: строки = видимые дни недели (из KitchenWeekProvider), столбцы = «Ввоз»
 * и «Вывоз». В ячейке — количество выбранных блюд (pluralRu). Клик по ячейке
 * открывает KitchenPassDialog — редактор пропуска этого дня с данным типом.
 *
 * Пропуски хранятся в localStorage 'kitchenPasses' в виде
 * { [dateISO]: { import?: string[], export?: string[] } } — ключ по дате (ISO),
 * чтобы пропуски не «поехали» при смене недели/начала недели.
 *
 * Кнопка «Экспорт в Excel» собирает листы для всех дней с выбранными блюдами:
 * «Ввоз 11.08» (клон IN), «Вывоз 12.08» (клон OUT) — один файл на неделю.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { exportKitchenPasses } from "@/lib/exportKitchenPasses";
import { pluralRu } from "@/app/lib/format";
import { KitchenPassDialog } from "./KitchenPassDialog";
import { useKitchenWeek, weekdayIdFromISO } from "./kitchenWeek";

type PassKind = "import" | "export";

/** Пропуска: { [dateISO]: { import?: string[], export?: string[] } } */
type PassesShape = Record<string, Partial<Record<PassKind, string[]>>>;

const PASS_COLUMNS: { id: PassKind; label: string; icon: string }[] = [
  { id: "import", label: "Ввоз", icon: "⬇️" },
  { id: "export", label: "Вывоз", icon: "⬆️" },
];

const STORAGE_KEY = "kitchenPasses";

function loadPasses(): PassesShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PassesShape) : {};
  } catch {
    return {};
  }
}

export function KitchenPasses() {
  const { visibleDays, dishes, dishById, menu, isLoading } = useKitchenWeek();
  const { showToast } = useToast();

  const [passes, setPasses] = useState<PassesShape>({});
  const [editing, setEditing] = useState<{ dateISO: string; kind: PassKind } | null>(null);

  // Гидратация из localStorage после монтирования (SSR-safe)
  useEffect(() => {
    setPasses(loadPasses());
  }, []);

  // Персист
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(passes));
    } catch {
      /* noop */
    }
  }, [passes]);

  // Санация при загрузке блюд: убираем несуществующие id
  const validIds = useMemo(() => new Set(dishes.map((d) => d.id)), [dishes]);
  useEffect(() => {
    if (dishes.length === 0) return;
    setPasses((prev) => {
      let changed = false;
      const next: PassesShape = {};
      for (const [dateISO, day] of Object.entries(prev)) {
        const clean: Partial<Record<PassKind, string[]>> = {};
        for (const kind of PASS_COLUMNS) {
          const ids = day[kind.id];
          if (ids) {
            const kept = ids.filter((id) => validIds.has(id));
            if (kept.length !== ids.length) changed = true;
            if (kept.length > 0) clean[kind.id] = kept;
          }
        }
        if (Object.keys(clean).length > 0) next[dateISO] = clean;
      }
      return changed ? next : prev;
    });
  }, [dishes, validIds]);

  /** Блюда для prefill: если сохранённых нет — берём из меню этого дня */
  function prefillFor(dateISO: string, kind: PassKind): string[] {
    const saved = passes[dateISO]?.[kind];
    if (saved && saved.length > 0) return saved;
    const dayId = weekdayIdFromISO(dateISO);
    const meals = menu[dayId];
    if (!meals) return [];
    return Object.values(meals).flat();
  }

  function handleSave(dateISO: string, kind: PassKind, dishIds: string[]) {
    setPasses((prev) => {
      const day = prev[dateISO] ?? {};
      const nextDay = { ...day };
      if (dishIds.length > 0) nextDay[kind] = dishIds;
      else delete nextDay[kind];
      const next = { ...prev };
      if (Object.keys(nextDay).length > 0) next[dateISO] = nextDay;
      else delete next[dateISO];
      return next;
    });
    showToast("Пропуск сохранён", "success");
  }

  async function handleExport() {
    const days = PASS_COLUMNS.flatMap((col) =>
      visibleDays
        .filter((day) => {
          const ids = passes[day.dateISO]?.[col.id];
          return ids && ids.length > 0;
        })
        .map((day) => {
          const ids = passes[day.dateISO]?.[col.id] ?? [];
          return {
            dateISO: day.dateISO,
            label: `${col.label} ${day.dateStr}`,
            dishNames: ids.map((id) => dishById.get(id)?.name ?? "").filter(Boolean),
          };
        }),
    );

    if (days.length === 0) {
      showToast("Нет пропусков для экспорта", "error");
      return;
    }

    try {
      await exportKitchenPasses(days);
      showToast("Пропуска экспортированы в Excel", "success");
    } catch {
      showToast("Ошибка при создании файла", "error");
    }
  }

  const totalSelected = Object.values(passes).reduce(
    (sum, day) => sum + PASS_COLUMNS.reduce((s, c) => s + (day[c.id]?.length ?? 0), 0),
    0,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          Кликните по ячейке, чтобы составить пропуск на день. Экспорт — один файл со всеми днями.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={totalSelected === 0}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 max-sm:min-h-11"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
          </svg>
          Экспорт в Excel
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : visibleDays.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-secondary p-6 text-center text-sm text-text-secondary">
          Не выбрано ни одного дня недели — отметьте дни во вкладке «Меню»
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-0 text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-text-secondary sm:px-4">День</th>
                {PASS_COLUMNS.map((col) => (
                  <th key={col.id} className="px-3 py-2 text-left font-medium text-text-secondary sm:px-4">
                    {col.icon} {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleDays.map((day) => (
                <tr key={day.dateISO} className="hover:bg-surface">
                  <td className="px-3 py-2 sm:px-4">
                    <div className="whitespace-nowrap font-medium text-foreground">{day.label}</div>
                    <div className="text-xs text-text-secondary">{day.dateStr}</div>
                  </td>
                  {PASS_COLUMNS.map((col) => {
                    const ids = passes[day.dateISO]?.[col.id];
                    const count = ids?.length ?? 0;
                    const filled = (ids ?? []).every((id) => dishById.has(id));
                    return (
                      <td key={col.id} className="px-3 py-2 sm:px-4">
                        <button
                          type="button"
                          onClick={() => setEditing({ dateISO: day.dateISO, kind: col.id })}
                          className={`inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border px-3 text-sm transition-colors max-sm:min-h-11 ${
                            count > 0
                              ? "border-primary bg-primary/10 text-foreground hover:bg-primary/20"
                              : "border-dashed border-border bg-surface text-text-secondary hover:border-primary hover:text-primary"
                          }`}
                        >
                          {count > 0 ? (
                            <>
                              <span className="font-medium">{pluralRu(count, ["блюдо", "блюда", "блюд"])}</span>
                              {!filled && <span className="text-xs text-text-secondary">(?)</span>}
                            </>
                          ) : (
                            <span className="text-xs">Добавить</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <KitchenPassDialog
          open
          title={`${PASS_COLUMNS.find((c) => c.id === editing.kind)?.label ?? ""} ${visibleDays.find((d) => d.dateISO === editing.dateISO)?.dateStr ?? ""}`}
          dishes={dishes}
          dishIds={prefillFor(editing.dateISO, editing.kind)}
          onSave={(dishIds) => handleSave(editing.dateISO, editing.kind, dishIds)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
