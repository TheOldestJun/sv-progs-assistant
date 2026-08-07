/*
 * RequestExcelButton — кнопка «Сохранить в Excel» для формы «Новая заявка».
 * Скачивает заявку по шаблону public/xls/REQUEST.xlsx с сохранением форматирования
 * (аналогично «Сохранить пропуск» в PassForm). Имя заявителя для подписи берётся
 * из /api/auth/me. Требует минимум одну заполненную позицию, максимум 25.
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toast";
import { downloadRequestExcel, MAX_ITEMS } from "./requestExcel";

export interface RequestExcelButtonItem {
  title: string;
  unitTitle: string;
  quantity: number;
}

interface Props {
  /** Дата заявки YYYY-MM-DD */
  date: string;
  /** Заполненные позиции (уже без optimistic-ид и пустых строк) */
  items: RequestExcelButtonItem[];
  disabled?: boolean;
}

export function RequestExcelButton({ date, items, disabled }: Props) {
  const { showToast } = useToast();

  // Имя заявителя для подписи (кэшируется на 5 минут)
  const { data: currentUser } = useQuery<{ id: string; name: string } | null>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  async function handleDownload() {
    if (items.length === 0) {
      showToast("Добавьте хотя бы одну заполненную позицию", "error");
      return;
    }
    if (items.length > MAX_ITEMS) {
      showToast(`В шаблоне максимум ${MAX_ITEMS} позиций`, "error");
      return;
    }
    if (!currentUser?.name) {
      showToast("Не удалось определить заявителя", "error");
      return;
    }

    try {
      await downloadRequestExcel({
        date,
        items,
        requesterName: currentUser.name,
      });
      showToast("Заявка сохранена в Excel", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ошибка при сохранении файла", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 max-sm:min-h-11"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
        <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
        <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
      </svg>
      Сохранить в Excel
    </button>
  );
}
