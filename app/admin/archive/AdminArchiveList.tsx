"use client";

import { useState, useMemo } from "react";
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

function formatMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const months = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];
  return `${months[m - 1]} ${y}`;
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function AdminArchiveList() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [requesterFilter, setRequesterFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading, isError } = useQuery<{ data: ArchiveEntry[]; total: number }>({
    queryKey: ["admin-archive", requesterFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (requesterFilter) params.set("requester", requesterFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
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

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, ArchiveEntry[]>();
    for (const entry of data.data) {
      const key = getMonthKey(entry.orderDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  const totalCount = data?.total ?? 0;

  async function handleDelete(entry: ArchiveEntry) {
    const ok = await confirm({
      title: "Удалить из архива?",
      message: `Запись «${entry.requesterName}» от ${new Date(entry.orderDate).toLocaleDateString("ru-RU")} будет удалена безвозвратно.`,
      confirmText: "Удалить",
      variant: "danger",
    });
    if (ok) deleteMutation.mutate(entry.id);
  }

  function toggleMonth(key: string) {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface-secondary p-2 sm:gap-3 sm:p-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Заказчик</label>
          <input
            type="text"
            value={requesterFilter}
            onChange={(e) => { setRequesterFilter(e.target.value); }}
            placeholder="Введите имя..."
            className="w-full sm:w-48 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm max-sm:py-2.5 text-foreground outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary max-sm:min-h-11"
          />
        </div>
        <DatePicker label="Дата с" value={dateFrom} onChange={setDateFrom} />
        <DatePicker label="Дата по" value={dateTo} onChange={setDateTo} />
      </div>

      {totalCount > 0 && (
        <p className="text-xs text-text-secondary">
          Всего записей: {totalCount}, по месяцам: {grouped.length}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-dashed border-red-300 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          Ошибка загрузки архива
        </div>
      ) : grouped.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">Архив пуст</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([monthKey, entries]) => {
            const isCollapsed = collapsedMonths.has(monthKey);
            return (
              <section key={monthKey} className="overflow-hidden rounded-xl border border-border">
                <button
                  onClick={() => toggleMonth(monthKey)}
                  className="flex w-full items-center gap-3 bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-secondary"
                >
                  <span className={`text-xs text-text-secondary transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}>
                    ▶
                  </span>
                  <h2 className="text-base font-semibold text-foreground">
                    {formatMonth(monthKey)}
                  </h2>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {entries.length}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-border">
                    {entries.map((entry) => (
                      <div key={entry.id}>
                        <div
                          className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-0.5 bg-surface-secondary px-2 py-1.5 sm:px-4 transition-colors hover:bg-surface"
                          onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        >
                          <span className={`text-xs text-text-secondary transition-transform ${expandedId === entry.id ? "rotate-90" : ""}`}>▶</span>
                          <span className="font-medium text-foreground">{entry.requesterName}</span>
                          <span className="text-xs text-text-secondary">
                            Заявлено: {new Date(entry.orderDate).toLocaleDateString("ru-RU")}
                          </span>
                          <span className="text-xs text-text-secondary">
                            Получено: {new Date(entry.receivedAt).toLocaleDateString("ru-RU")}
                          </span>
                          <span className="ml-auto">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(entry); }}
                              disabled={deleteMutation.isPending}
                              className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
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
                                  <th className="px-2 py-0.5 text-left font-medium text-text-secondary sm:px-4">ТМЦ</th>
                                  <th className="px-2 py-0.5 text-left font-medium text-text-secondary sm:px-4">Ед.</th>
                                  <th className="px-2 py-0.5 text-right font-medium text-text-secondary sm:px-4">Кол-во</th>
                                  <th className="px-2 py-0.5 text-left font-medium text-text-secondary sm:px-4">Комментарий</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {entry.items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="px-2 py-0.5 text-foreground sm:px-4">{item.product}</td>
                                    <td className="px-2 py-0.5 text-text-secondary sm:px-4">{item.unit}</td>
                                    <td className="px-2 py-0.5 text-right text-foreground sm:px-4">{item.quantity}</td>
                                    <td className="px-2 py-0.5 text-text-secondary sm:px-4">{item.comment || "—"}</td>
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
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}