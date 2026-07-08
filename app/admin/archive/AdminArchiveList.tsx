/*
 * AdminArchiveList — просмотр архива для ADMIN с кнопкой полного удаления.
 * Фильтрация и пагинация на клиенте.
 */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toast";
import { DatePicker } from "@/components/ui/DatePicker";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

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

export function AdminArchiveList() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [requesterFilter, setRequesterFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading, isError } = useQuery<{ data: ArchiveEntry[]; total: number }>({
    queryKey: ["admin-archive", requesterFilter, dateFrom, dateTo, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (requesterFilter) params.set("requester", requesterFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (page) params.set("page", String(page));
      const qs = params.toString();
      const res = await fetch(qs ? `/api/archive?${qs}` : "/api/archive");
      if (!res.ok) throw new Error("Failed to fetch archive");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/archive/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка удаления");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-archive"] });
      showToast("Запись удалена из архива", "success");
    },
    onError: (e) => {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    },
  });

  async function handleDelete(entry: ArchiveEntry) {
    const ok = await confirm({
      title: "Удалить из архива?",
      message: `Запись «${entry.requesterName}» от ${new Date(entry.orderDate).toLocaleDateString("ru-RU")} будет удалена безвозвратно.`,
      confirmText: "Удалить",
      variant: "danger",
    });
    if (ok) deleteMutation.mutate(entry.id);
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const safePage = Math.min(page, totalPages - 1);

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface-secondary p-2 sm:gap-3 sm:p-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Заказчик</label>
          <input
            type="text"
            value={requesterFilter}
            onChange={(e) => { setRequesterFilter(e.target.value); setPage(0); }}
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
          Ошибка загрузки архива
        </div>
      ) : !data || data.data.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">Архив пуст</p>
      ) : (
        <>
          <div className="space-y-3">
            {data.data.map((entry) => (
              <div key={entry.id} className="overflow-hidden rounded-lg border border-border">
                <div
                  className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1.5 bg-surface-secondary px-2 py-1.5 sm:px-4 sm:py-2.5 transition-colors hover:bg-surface sm:gap-4 sm:py-3"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <span className={`text-xs text-text-secondary transition-transform ${expandedId === entry.id ? "rotate-90" : ""}`}>▶</span>
                  <span className="font-medium text-foreground">{entry.requesterName}</span>
                  <span className="text-text-secondary">
                    Заявлено: {new Date(entry.orderDate).toLocaleDateString("ru-RU")}
                  </span>
                  <span className="text-text-secondary">
                    Получено: {new Date(entry.receivedAt).toLocaleDateString("ru-RU")}
                  </span>
                  <span className="ml-auto">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(entry); }}
                      disabled={deleteMutation.isPending}
                      className="rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900 max-sm:min-h-11"
                    >
                      {deleteMutation.isPending ? "…" : "Удалить"}
                    </button>
                  </span>
                </div>

                {expandedId === entry.id && (
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
                            <td className="px-2 py-1.5 sm:px-4 sm:py-2 text-text-secondary">{item.comment || "—"}</td>
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
                    className={`rounded-md px-3 py-1.5 text-sm max-sm:py-2 transition-colors max-sm:min-h-11 ${i === safePage ? "bg-primary text-primary-foreground" : "hover:bg-surface-secondary"}`}
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
