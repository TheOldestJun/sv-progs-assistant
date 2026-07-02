/*
 * ArchiveTable — таблица архивных (удалённых) заявок.
 * Показывает краткую информацию: заявитель, дата заявки, дата получения, список позиций.
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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

async function fetchArchive(): Promise<ArchiveEntry[]> {
  const res = await fetch("/api/archive");
  if (!res.ok) throw new Error("Failed to fetch archive");
  return res.json();
}

export function ArchiveTable() {
  const [requester, setRequester] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // queryKey включает фильтры: при изменении requester/dateFrom/dateTo
  // React Query автоматически перезапрашивает данные (refetch)
  const queryKey = ["archive", requester, dateFrom, dateTo];
  const { data, isLoading, isError, error } = useQuery<ArchiveEntry[]>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (requester) params.set("requester", requester);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const qs = params.toString();
      return fetch(qs ? `/api/archive?${qs}` : "/api/archive").then((r) => {
        if (!r.ok) throw new Error("Failed to fetch archive");
        return r.json();
      });
    },
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-secondary p-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Заказчик</label>
          <input
            type="text"
            value={requester}
            onChange={(e) => setRequester(e.target.value)}
            placeholder="Введите имя..."
            className="w-48 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <DatePicker label="Дата с" value={dateFrom} onChange={setDateFrom} />
        <DatePicker label="Дата по" value={dateTo} onChange={setDateTo} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-dashed border-red-300 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          Ошибка загрузки: {error instanceof Error ? error.message : "Неизвестная ошибка"}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-secondary p-6 text-center">
          <p className="text-sm text-text-secondary">Архив пуст</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((entry) => (
        <div key={entry.id} className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between bg-surface-secondary px-4 py-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium text-foreground">
                {entry.requesterName}
              </span>
              <span className="text-text-secondary">
                {new Date(entry.orderDate).toLocaleDateString("ru-RU")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">
                Получено: {new Date(entry.receivedAt).toLocaleDateString("ru-RU")}
              </span>
              <button
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                className="text-xs text-accent-blue transition-colors hover:text-accent-blue-hover"
              >
                {expanded === entry.id ? "Скрыть" : "Показать"}
              </button>
            </div>
          </div>

          {expanded === entry.id && (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-text-secondary">Продукт</th>
                    <th className="px-4 py-2 text-left font-medium text-text-secondary">Ед.</th>
                    <th className="px-4 py-2 text-right font-medium text-text-secondary">Кол-во</th>
                    <th className="px-4 py-2 text-left font-medium text-text-secondary">Комментарий</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entry.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-surface">
                      <td className="px-4 py-2 text-foreground">{item.product}</td>
                      <td className="px-4 py-2 text-text-secondary">{item.unit}</td>
                      <td className="px-4 py-2 text-right text-foreground">{item.quantity}</td>
                      <td className="px-4 py-2 text-text-secondary">
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
      )}
    </div>
  );
}
