/*
 * DatePicker — кастомный выбор даты с календарём в стиле приложения.
 * Заменяет нативный <input type="date"> для единообразного вида.
 */
"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1);
  const day = d.getDay();
  return day === 0 ? 6 : day - 1; // Пн=0 ... Вс=6
}

function formatDateValue(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DatePicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const parsed = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());

  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const days = useMemo(() => {
    const count = getDaysInMonth(viewYear, viewMonth);
    const start = getFirstDayOfMonth(viewYear, viewMonth);
    const result: (number | null)[] = [];
    for (let i = 0; i < start; i++) result.push(null);
    for (let d = 1; d <= count; d++) result.push(d);
    return result;
  }, [viewYear, viewMonth]);

  const todayStr = useMemo(
    () => formatDateValue(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
    [],
  );

  const displayText = useMemo(() => {
    if (!value) return "";
    const d = new Date(value + "T00:00:00");
    return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
  }, [value]);

  const selectDay = useCallback(
    (day: number) => {
      onChange(formatDateValue(viewYear, viewMonth, day));
      setOpen(false);
    },
    [viewYear, viewMonth, onChange],
  );

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex max-sm:min-h-11 w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4 shrink-0 text-text-secondary"
        >
          <path
            fillRule="evenodd"
            d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75a.75.75 0 0 1 .75-.75Zm-1.5 6.5v7.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-7.5H4.25Z"
            clipRule="evenodd"
          />
        </svg>
        <span className={value ? "" : "text-text-secondary"}>
          {value ? displayText : "Выберите дату"}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-surface p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="flex size-7 max-sm:min-h-11 max-sm:min-w-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-secondary hover:text-foreground"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="text-sm font-medium text-foreground">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex size-7 max-sm:min-h-11 max-sm:min-w-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-secondary hover:text-foreground"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="py-1 text-center text-xs font-medium text-text-secondary"
              >
                {wd}
              </div>
            ))}
            {days.map((day, i) =>
              day === null ? (
                <div key={`e-${i}`} />
              ) : (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`flex max-sm:min-h-11 w-full items-center justify-center rounded-md py-1 text-sm transition-colors hover:bg-surface-secondary ${
                    formatDateValue(viewYear, viewMonth, day) === value
                      ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                      : formatDateValue(viewYear, viewMonth, day) === todayStr
                        ? "font-semibold text-foreground ring-1 ring-inset ring-border"
                        : "text-foreground"
                  }`}
                >
                  {day}
                </button>
              ),
            )}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-2 flex max-sm:min-h-11 w-full items-center justify-center rounded-md text-xs text-text-secondary transition-colors hover:bg-surface-secondary hover:text-foreground"
            >
              Очистить
            </button>
          )}
        </div>
      )}
    </div>
  );
}
