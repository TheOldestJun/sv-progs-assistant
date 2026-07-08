/*
 * AdminOrderList — таблица заявок с возможностью редактирования даты и просмотра позиций
 */
"use client";

import { useState } from "react";
import * as React from "react";
import { useToast } from "@/components/ui/Toast";
import { DatePicker } from "@/components/ui/DatePicker";
import { STATUS_LABELS } from "@/hooks/useOrders";

interface OrderItem {
  id: string;
  quantity: number;
  comment: string | null;
  status: string;
  product: { title: string };
  units: { title: string };
}

interface Order {
  id: string;
  created: string;
  requester: { name: string };
  createdBy: { name: string } | null;
  items: OrderItem[];
}

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  INVOICE_RECEIVED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  INVOICE_PAID: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  SHIPPED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  RECEIVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

export function AdminOrderList({ orders: initial }: { orders: Order[] }) {
  const [orders, setOrders] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  function startEdit(order: Order) {
    setEditingId(order.id);
    setEditDate(order.created.slice(0, 10));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDate("");
  }

  async function saveDate(orderId: string) {
    if (!editDate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created: editDate }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка сохранения");
      }
      const data = await res.json();
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, created: data.created } : o)),
      );
      setEditingId(null);
      showToast("Дата сохранена", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    } finally {
      setSaving(false);
    }
  }

  if (orders.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        Нет заявок
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-text-secondary">Дата</th>
            <th className="px-3 py-2 text-left font-medium text-text-secondary">Заявитель</th>
            <th className="px-3 py-2 text-left font-medium text-text-secondary">Создал</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">Позиций</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((order) => {
            const isEditing = editingId === order.id;
            const isExpanded = expandedId === order.id;
            return (
              <React.Fragment key={order.id}>
                <tr className="hover:bg-surface">
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <DatePicker
                        label=""
                        value={editDate}
                        onChange={setEditDate}
                      />
                    ) : (
                      <span className="text-foreground">
                        {new Date(order.created).toLocaleDateString("ru-RU")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-foreground">{order.requester.name}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {order.createdBy?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-text-secondary">
                    {order.items.length}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary max-sm:min-h-11"
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                      {isEditing ? (
                        <>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary disabled:opacity-50 max-sm:min-h-11"
                          >
                            Отмена
                          </button>
                          <button
                            onClick={() => saveDate(order.id)}
                            disabled={saving}
                            className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 max-sm:min-h-11"
                          >
                            {saving ? "…" : "Сохранить"}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEdit(order)}
                          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary max-sm:min-h-11"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={5} className="bg-surface-secondary px-3 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-text-secondary">
                            <th className="px-2 py-1 text-left font-medium">ТМЦ</th>
                            <th className="px-2 py-1 text-left font-medium">Ед.</th>
                            <th className="px-2 py-1 text-right font-medium">Кол-во</th>
                            <th className="px-2 py-1 text-left font-medium">Статус</th>
                            <th className="px-2 py-1 text-left font-medium">Комментарий</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {order.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-2 py-1 text-foreground">{item.product.title}</td>
                              <td className="px-2 py-1 text-text-secondary">{item.units.title}</td>
                              <td className="px-2 py-1 text-right text-foreground">{item.quantity}</td>
                              <td className="px-2 py-1">
                                <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[item.status] || ""}`}>
                                  {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status}
                                </span>
                              </td>
                              <td className="px-2 py-1 text-text-secondary">
                                {item.comment || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
