"use client";
import { useState, useRef, useEffect, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrderItemStatus } from "@prisma/client";
import { useToast } from "@/components/ui/Toast";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DatePicker } from "@/components/ui/DatePicker";
import { Autocomplete, type AutocompleteItem } from "@/components/ui/Autocomplete";
import { StatusIcon } from "@/components/dashboard/StatusIcon";
import { STATUS_LABELS } from "@/hooks/useOrders";
import { useReferenceData } from "@/hooks/useReferenceData";

interface AdminItem {
  id: string;
  quantity: number;
  comment: string | null;
  status: OrderItemStatus;
  productId: string;
  unitId: string;
  product: { title: string };
  units: { title: string };
}

interface AdminOrder {
  id: string;
  created: string;
  requester: { name: string };
  items: AdminItem[];
}

const STATUS_COLORS: Record<OrderItemStatus, string> = {
  ACCEPTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  INVOICE_RECEIVED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  INVOICE_PAID: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  SHIPPED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  RECEIVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  SENT_TO_REQUESTER: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  ORDER_CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const STATUS_ORDER_ALL = Object.values(OrderItemStatus);

async function apiPatch<T>(url: string, data: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка запроса");
  }
  return res.json();
}

async function apiDelete(url: string, data?: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка запроса");
  }
  return res.json();
}

export function AdminOrderList({ orders: initial }: { orders: AdminOrder[] }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();

  const { data: products } = useReferenceData("products", "/api/products");
  const { data: units } = useReferenceData("units", "/api/units");

  const { data: orders } = useQuery<AdminOrder[]>({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    initialData: initial,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [dateValue, setDateValue] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentValue, setCommentValue] = useState("");

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [bumpItem, setBumpItem] = useState<{ orderId: string; itemId: string; productName: string } | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setMenuPos(null);
      }
    }
    if (openMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenu]);

  const updateMutation = useMutation({
    mutationFn: async ({ orderId, itemId, data }: { orderId: string; itemId: string; data: Record<string, unknown> }) => {
      return apiPatch(`/api/orders/${orderId}/items/${itemId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const orderMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: Record<string, unknown> }) => {
      return apiPatch(`/api/orders/${orderId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  async function handleDateSave(orderId: string) {
    if (!dateValue) return;
    try {
      await orderMutation.mutateAsync({ orderId, data: { created: dateValue } });
      setEditingDate(null);
      showToast("Дата сохранена", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  }

  async function handleStatusChange(itemId: string, newStatus: OrderItemStatus) {
    const menuItem = itemsMap.get(itemId);
    if (!menuItem) return;

    if (menuItem.status === newStatus) {
      setOpenMenu(null);
      return;
    }

    const ok = await confirm({
      title: "Сменить статус?",
      message: `«${menuItem.product.title}»: ${STATUS_LABELS[menuItem.status]} → ${STATUS_LABELS[newStatus]}`,
      confirmText: "Сменить",
      variant: "default",
    });
    if (!ok) return;

    try {
      await updateMutation.mutateAsync({
        orderId: menuItem.orderId,
        itemId,
        data: { status: newStatus },
      });
      showToast(`Статус изменён на «${STATUS_LABELS[newStatus]}»`, "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
    setOpenMenu(null);
    setMenuPos(null);
  }

  async function handleQuantityChange(orderId: string, itemId: string, quantity: number) {
    if (isNaN(quantity) || quantity <= 0) {
      showToast("Количество должно быть положительным числом", "error");
      return;
    }
    try {
      await updateMutation.mutateAsync({ orderId, itemId, data: { quantity } });
      showToast("Количество сохранено", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  }

  async function handleProductChange(orderId: string, itemId: string, productId: string) {
    try {
      await updateMutation.mutateAsync({ orderId, itemId, data: { productId } });
      showToast("ТМЦ заменён", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  }

  async function handleUnitChange(orderId: string, itemId: string, unitId: string) {
    try {
      await updateMutation.mutateAsync({ orderId, itemId, data: { unitId } });
      showToast("Единица изменена", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  }

  async function handleCommentSave(orderId: string, itemId: string, comment: string) {
    try {
      await updateMutation.mutateAsync({ orderId, itemId, data: { comment } });
      setEditingComment(null);
      showToast("Комментарий сохранён", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  }

  async function handleBumpConfirm() {
    if (!bumpItem) return;
    try {
      await apiDelete(`/api/orders/${bumpItem.orderId}/items/${bumpItem.itemId}`, { reason: "перенос администратором" });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setBumpItem(null);
      showToast("Позиция перенесена в новую заявку", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  }

  const itemsMap = new Map<string, { id: string; orderId: string; status: OrderItemStatus; product: { title: string } }>();
  for (const order of orders) {
    for (const item of order.items) {
      itemsMap.set(item.id, { id: item.id, orderId: order.id, status: item.status, product: { title: item.product.title } });
    }
  }

  if (orders.length === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">Нет заявок</p>;
  }

  return (
    <>
    <div className="overflow-x-auto">
      {openMenu && menuPos && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setOpenMenu(null); setMenuPos(null); }} />
          <div
            ref={menuRef}
            className="fixed z-40 w-56 rounded-lg border border-border bg-surface py-1 shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {STATUS_ORDER_ALL.map((s) => {
              const current = openMenu ? itemsMap.get(openMenu) : undefined;
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(openMenu, s)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-surface-secondary ${
                    current?.status === s
                      ? "font-semibold text-foreground"
                      : "text-text-secondary"
                  }`}
                >
                  <StatusIcon status={s} />
                  {STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
        </>
      )}
      <table className="w-full text-sm">
        <thead className="bg-surface">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-text-secondary">Дата</th>
            <th className="px-3 py-2 text-left font-medium text-text-secondary">Заявитель</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">Позиций</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const isDateEditing = editingDate === order.id;
            return (
              <Fragment key={order.id}>
              <tr
                className="cursor-pointer hover:bg-surface"
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  {isDateEditing ? (
                    <div className="flex items-center gap-1">
                      <DatePicker label="" value={dateValue} onChange={setDateValue} />
                      <button
                        onClick={() => handleDateSave(order.id)}
                        disabled={orderMutation.isPending}
                        className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setEditingDate(null)}
                        className="rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-surface-secondary"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-foreground">{new Date(order.created).toLocaleDateString("ru-RU")}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingDate(order.id); setDateValue(order.created.slice(0, 10)); }}
                        className="ml-1 rounded px-1 text-xs text-text-secondary opacity-0 transition-opacity hover:opacity-100"
                        title="Изменить дату"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-foreground">{order.requester.name}</td>
                <td className="px-3 py-2 text-right text-text-secondary">{order.items.length}</td>
                <td className="px-3 py-2 text-right">
                  <span className="text-xs text-text-secondary">{isExpanded ? "▲" : "▼"}</span>
                </td>
              </tr>
              {isExpanded && (
                <tr key={`${order.id}-items`}>
                  <td colSpan={4} className="bg-surface-secondary p-3">
                    {order.items.length === 0 ? (
                      <p className="py-4 text-center text-sm text-text-secondary">Нет позиций</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {order.items.map((item) => {
                          const currentProduct = products.find((p) => p.id === item.productId);
                          const currentUnit = units.find((u) => u.id === item.unitId);
                          const isCommentEditing = editingComment === item.id;
                          const isPending = updateMutation.isPending;
                          return (
                            <div key={item.id} className="grid gap-2 py-3 sm:grid-cols-[2fr_1fr_80px_1fr_auto] sm:items-center">
                              <div>
                                <label className="mb-0.5 block text-[10px] font-medium uppercase text-text-secondary">ТМЦ</label>
                                <Autocomplete
                                  items={products}
                                  value={currentProduct ? { id: currentProduct.id, title: currentProduct.title } : null}
                                  onSelect={(p) => handleProductChange(order.id, item.id, p.id)}
                                  onCreate={() => ({ id: "", title: "" })}
                                  placeholder={item.product.title}
                                />
                              </div>
                              <div>
                                <label className="mb-0.5 block text-[10px] font-medium uppercase text-text-secondary">Ед.</label>
                                <Autocomplete
                                  items={units}
                                  value={currentUnit ? { id: currentUnit.id, title: currentUnit.title } : null}
                                  onSelect={(u) => handleUnitChange(order.id, item.id, u.id)}
                                  onCreate={() => ({ id: "", title: "" })}
                                  placeholder={item.units.title}
                                />
                              </div>
                              <div>
                                <label className="mb-0.5 block text-[10px] font-medium uppercase text-text-secondary">Кол-во</label>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  defaultValue={item.quantity}
                                  disabled={isPending}
                                  onBlur={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (val !== item.quantity) handleQuantityChange(order.id, item.id, val);
                                  }}
                                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                  className="w-full rounded border border-border bg-surface px-2 py-1.5 text-right text-sm text-foreground outline-none transition-colors focus:border-primary disabled:opacity-50"
                                />
                              </div>
                              <div>
                                <label className="mb-0.5 block text-[10px] font-medium uppercase text-text-secondary">Статус</label>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setOpenMenu(item.id);
                                    setMenuPos({ top: rect.bottom + 4, left: rect.left });
                                  }}
                                  disabled={isPending}
                                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-black/5 transition-colors disabled:opacity-50 cursor-pointer ${STATUS_COLORS[item.status]}`}
                                >
                                  <StatusIcon status={item.status} />
                                  {STATUS_LABELS[item.status]}
                                </button>
                              </div>
                              <div className="flex items-start gap-1 pt-4 sm:pt-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setBumpItem({ orderId: order.id, itemId: item.id, productName: item.product.title }); }}
                                  disabled={isPending}
                                  className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                                  title="Перенести в новую заявку"
                                >
                                  🗑️
                                </button>
                              </div>
                              <div className="sm:col-span-5" onClick={(e) => e.stopPropagation()}>
                                {isCommentEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={commentValue}
                                      onChange={(e) => setCommentValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleCommentSave(order.id, item.id, commentValue);
                                        if (e.key === "Escape") setEditingComment(null);
                                      }}
                                      autoFocus
                                      className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                                    />
                                    <button
                                      onClick={() => handleCommentSave(order.id, item.id, commentValue)}
                                      className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
                                    >
                                      OK
                                    </button>
                                    <button
                                      onClick={() => setEditingComment(null)}
                                      className="rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-surface-secondary"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingComment(item.id); setCommentValue(item.comment || ""); }}
                                    className="w-full rounded border border-dashed border-transparent px-2 py-1 text-left text-xs text-text-secondary transition-colors hover:border-border hover:text-foreground"
                                  >
                                    {item.comment ? (
                                      <span className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3 shrink-0">
                                          <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h13A1.5 1.5 0 0 1 18 3.5v10a1.5 1.5 0 0 1-1.5 1.5h-7l-3.5 3.5V15H3.5A1.5 1.5 0 0 1 2 13.5v-10Z" clipRule="evenodd" />
                                        </svg>
                                        {item.comment}
                                      </span>
                                    ) : (
                                      <span className="italic">Добавить комментарий...</span>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>

      {bumpItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setBumpItem(null)} />
          <div className="relative z-10 w-full max-w-md animate-fade-in overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800 dark:text-gray-100">
            <div className="p-6">
              <h2 className="text-base font-semibold text-foreground">Перенести позицию</h2>
              <p className="mt-2 text-sm text-text-secondary">
                Позиция «{bumpItem.productName}» будет перенесена в новую заявку.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-border bg-surface-secondary px-6 py-4">
              <button
                onClick={() => setBumpItem(null)}
                className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary"
              >
                Отмена
              </button>
              <button
                onClick={handleBumpConfirm}
                className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Перенести
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}