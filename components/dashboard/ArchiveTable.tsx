/*
 * ArchiveTable — таблица архивных (удалённых) заявок с фильтрами и пагинацией.
 * Фильтры: заявитель (debounce 300ms), дата с/по.
 * Пагинация: 20 записей на страницу.
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { DatePicker } from "@/components/ui/DatePicker";

interface ArchiveItem {
  product: string;
  unit: string;
  quantity: number;
  comment: string | null;
}

interface ArchiveEntry {
  id: string;
  originalId: string;
  requesterName: string;
  orderDate: string;
  receivedAt: string;
  archivedAt: string;
  items: ArchiveItem[];
}

const PAGE_SIZE = 20;

export function ArchiveTable() {
  const [requester, setRequester] = useState("");
  const [debouncedRequester, setDebouncedRequester] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedRequester(requester);
      setPage(0);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [requester]);

  const queryKey = ["archive", debouncedRequester, dateFrom, dateTo, page];
  const { data, isLoading, isError, error } = useQuery<{ data: ArchiveEntry[]; total: number }>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedRequester) params.set("requester", debouncedRequester);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (page) params.set("page", String(page));
      const qs = params.toString();
      return fetch(qs ? `/api/archive?${qs}` : "/api/archive").then((r) => {
        if (!r.ok) throw new Error("Failed to fetch archive");
        return r.json();
      });
    },
  });

  const [expanded, setExpanded] = useState<string | null>(null);
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const safePage = Math.min(page, totalPages - 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface-secondary p-2 sm:gap-3 sm:p-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Заказчик</label>
          <input
            type="text"
            value={requester}
            onChange={(e) => {
              setRequester(e.target.value);
            }}
            placeholder="Введите имя..."
            className="w-full sm:w-48 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm max-sm:py-2.5 text-foreground outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary max-sm:min-h-11"
          />
        </div>
        <DatePicker label="Дата с" value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(0); }} />
        <DatePicker label="Дата по" value={dateTo} onChange={(v) => { setDateTo(v); setPage(0); }} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-dashed border-red-300 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          Ошибка загрузки: {error instanceof Error ? error.message : "Неизвестная ошибка"}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-secondary p-6 text-center">
          <p className="text-sm text-text-secondary">Архив пуст</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data.data.map((entry) => (
              <div key={entry.id} className="overflow-hidden rounded-lg border border-border">
                <div
                  className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1.5 bg-surface-secondary px-2 py-1.5 sm:px-4 sm:py-2.5 transition-colors hover:bg-surface sm:gap-4 sm:py-3"
                  onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                >
                  <span className={`text-xs text-text-secondary transition-transform ${expanded === entry.id ? "rotate-90" : ""}`}>▶</span>
                  <span className="font-medium text-foreground">
                    {entry.requesterName}
                  </span>
                  <span className="text-text-secondary">
                    Заявлено: {new Date(entry.orderDate).toLocaleDateString("ru-RU")}
                  </span>
                  <span className="text-text-secondary">
                    Получено: {new Date(entry.receivedAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>

                {expanded === entry.id && (
                  <div className="overflow-x-auto border-t border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-surface">
                        <tr>
                          <th className="px-2 py-1.5 sm:px-4 sm:py-2 text-left font-medium text-text-secondary">ТМЦ</th>
                          <th className="px-2 py-1.5 sm:px-4 sm:py-2 text-left font-medium text-text-secondary">Ед.</th>
                          <th className="px-2 py-1.5 sm:px-4 sm:py-2 text-right font-medium text-text-secondary">Кол-во</th>
                          <th className="px-2 py-1.5 sm:px-4 sm:py-2 text-left font-medium text-text-secondary">Комментарий</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {entry.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-surface">
                            <td className="px-2 py-1.5 sm:px-4 sm:py-2 text-foreground">{item.product}</td>
                            <td className="px-2 py-1.5 sm:px-4 sm:py-2 text-text-secondary">{item.unit}</td>
                            <td className="px-2 py-1.5 sm:px-4 sm:py-2 text-right text-foreground">{item.quantity}</td>
                            <td className="px-2 py-1.5 sm:px-4 sm:py-2 text-text-secondary">
                              {item.comment || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                </div>
              ))}
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 text-sm text-text-secondary">
              <span>
                {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, data.total)} из {data.total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="rounded-md px-3 py-1.5 text-sm max-sm:py-2 transition-colors hover:bg-surface-secondary disabled:opacity-30 max-sm:min-h-11"
                >
                  ← Назад
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`rounded-md px-3 py-1.5 text-sm max-sm:py-2 transition-colors max-sm:min-h-11 ${
                      i === safePage
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-surface-secondary"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage === totalPages - 1}
                  className="rounded-md px-3 py-1.5 text-sm max-sm:py-2 transition-colors hover:bg-surface-secondary disabled:opacity-30 max-sm:min-h-11"
                >
                  Вперед →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
