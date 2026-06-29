/*
 * OrderStatusTable — таблица заявок с управлением статусами позиций.
 * - Отображает все заявки, сгруппированные по дате (свежие сверху)
 * - Каждая позиция имеет статус, который можно менять через выпадающий список
 * - Расширяемая история изменений (statusLogs) при клике на позицию
 * Используется в SupplyDeptDashboard и HeadOfSupplyDashboard.
 */
"use client";

import { useState } from "react";
import * as React from "react";
import { useOrders, useUpdateOrderItemStatus, STATUS_LABELS, STATUS_ORDER, type OrderItemStatus } from "@/hooks/useOrders";
import { useToast } from "@/components/ui/Toast";

const STATUS_COLORS: Record<OrderItemStatus, string> = {
  ACCEPTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  INVOICE_RECEIVED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  INVOICE_PAID: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  SHIPPED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  RECEIVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

function StatusIcon({ status, className }: { status: OrderItemStatus; className?: string }) {
  const cls = `size-3.5 shrink-0 ${className || ""}`;
  switch (status) {
    case "ACCEPTED":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cls}>
          <path fillRule="evenodd" d="M6 2.75A.75.75 0 0 1 6.75 2h6.5a.75.75 0 0 1 0 1.5h-2.5v1.75c0 .69-.56 1.25-1.25 1.25h-1.5a.75.75 0 0 1 0-1.5h.5V3.5h-2A.75.75 0 0 1 6 2.75ZM6 7a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 6 7Zm0 3a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 6 10Zm6 2.25a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5h3.5Z" clipRule="evenodd" />
          <path d="M11.5 15.25a.75.75 0 0 0 0 1.5h.75a.75.75 0 0 0 0-1.5h-.75Z" />
          <path d="M3.5 3.5A1.5 1.5 0 0 0 2 5v10a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V5a1.5 1.5 0 0 0-1.5-1.5h-8Zm0 1.5h8a.25.25 0 0 1 .25.25v10a.25.25 0 0 1-.25.25h-8a.25.25 0 0 1-.25-.25V5a.25.25 0 0 1 .25-.25Z" />
        </svg>
      );
    case "INVOICE_RECEIVED":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cls}>
          <path d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13.256c0 .72.514 1.338 1.215 1.482a7.516 7.516 0 0 0 3.57-.372 7.5 7.5 0 0 1 4.43 0 7.516 7.516 0 0 0 3.57.372c.701-.144 1.215-.762 1.215-1.482V3.5A1.5 1.5 0 0 0 15.5 2h-11Zm3.75 3.75a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1 0-1.5h2.5ZM7 8.5a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 7 8.5Zm-1.5 3.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" />
        </svg>
      );
    case "INVOICE_PAID":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cls}>
          <path fillRule="evenodd" d="M2.5 4A1.5 1.5 0 0 0 1 5.5V6h18v-.5A1.5 1.5 0 0 0 17.5 4h-15ZM1 10.25V14a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 19 14v-3.75h-4.5a2.5 2.5 0 0 1-5 0H1Zm15.5 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          <path d="M11.5 10.25a1.5 1.5 0 0 1-3 0H1V7h18v3.25h-7.5Z" />
        </svg>
      );
    case "SHIPPED":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cls}>
          <path d="M6.5 3c-1.051 0-2.093.04-3.125.117A1.49 1.49 0 0 0 2 4.607V10.5h4.75a.75.75 0 0 1 .75.75v3.25h1.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75V12H3.5v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463C4.286 3.07 5.436 3 6.5 3ZM17.5 4.607c0-.72-.514-1.34-1.223-1.463A24.7 24.7 0 0 0 12.5 3c-1.064 0-2.116.033-3.152.115C8.173 3.206 7.5 3.976 7.5 4.726V10.5h3.75a.75.75 0 0 1 .75.75v3.25h.625a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75V12H10v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463A24.7 24.7 0 0 1 12.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V12h-2.25v2.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H9V12H2.5v2.25a.75.75 0 0 1-1.5 0V4.607c0-.72.514-1.34 1.223-1.463C3.286 3.07 4.436 3 5.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V10.5h3.75a.75.75 0 0 1 .75.75v3.25h.625a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75V12H10v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463A24.7 24.7 0 0 1 12.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V12h-2.25v2.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H9V12H2.5v2.25a.75.75 0 0 1-1.5 0V4.607c0-.72.514-1.34 1.223-1.463C3.286 3.07 4.436 3 5.5 3Z" />
        </svg>
      );
    case "RECEIVED":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cls}>
          <path d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 0 0-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 0 0 0-1.5H5.378A2.25 2.25 0 0 1 7.5 15h11.218a.75.75 0 0 0 .674-.421 60.358 60.358 0 0 0 2.96-7.228.75.75 0 0 0-.525-.965A60.864 60.864 0 0 0 5.68 4.509l-.232-.867A1.875 1.875 0 0 0 3.636 2.25H2.25ZM6.75 17.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM15.75 17.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        </svg>
      );
  }
}

export function OrderStatusTable() {
  const { data: orders, isLoading, isError, error } = useOrders();
  const updateStatus = useUpdateOrderItemStatus();
  const { showToast } = useToast();
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  function openMenu(itemId: string, buttonEl: HTMLButtonElement) {
    if (openSelect === itemId) {
      setOpenSelect(null);
      setMenuPos(null);
      return;
    }
    const rect = buttonEl.getBoundingClientRect();
    const menuWidth = 224; // w-56 = 224px
    const left = rect.left + menuWidth > window.innerWidth
      ? window.innerWidth - menuWidth - 8
      : rect.left;
    setMenuPos({ top: rect.bottom + 4, left });
    setOpenSelect(itemId);
  }

  function closeMenu() {
    setOpenSelect(null);
    setMenuPos(null);
  }

  function toggleItem(itemId: string) {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  }

  async function handleStatusChange(itemId: string, orderId: string, status: OrderItemStatus) {
    closeMenu();
    updateStatus.mutate(
      { orderId, itemId, status },
      {
        onSuccess: () => showToast(`Статус изменён на «${STATUS_LABELS[status]}»`, "success"),
        onError: (err) => showToast(err.message, "error"),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-dashed border-red-300 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
        Ошибка загрузки: {error instanceof Error ? error.message : "Неизвестная ошибка"}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-secondary p-6 text-center">
        <p className="text-sm text-text-secondary">
          Пока нет ни одной заявки
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className="overflow-hidden rounded-lg border border-border"
        >
          <div className="flex items-center justify-between bg-surface-secondary px-4 py-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium text-foreground">
                {order.requester.name}
              </span>
              <span className="text-text-secondary">
                {new Date(order.created).toLocaleDateString("ru-RU")}
              </span>
            </div>
            <span className="text-xs text-text-secondary">
              {order.items.reduce((s, it) => s + it.quantity, 0)} ед.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Продукт</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Ед.</th>
                <th className="px-4 py-2 text-right font-medium text-text-secondary">Кол-во</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.items.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className="hover:bg-surface">
                    <td className="px-4 py-2">
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="flex items-center gap-1.5 text-left text-foreground transition-colors hover:text-primary"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className={`size-3.5 shrink-0 transition-transform ${
                            expandedItem === item.id ? "rotate-90" : ""
                          }`}
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {item.product.title}
                        {item.comment && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="size-3.5 text-accent-blue"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 0 1-4.083-.98L2 17l1.338-2.566A6.973 6.973 0 0 1 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7ZM7 9H5v2h2V9Zm8 0h-2v2h2V9Zm-4 0H9v2h2V9Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-text-secondary">
                      {item.units.title}
                    </td>
                    <td className="px-4 py-2 text-right text-foreground">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-2">
                      <div className="relative">
                        <button
                          onClick={(e) => openMenu(item.id, e.currentTarget)}
                          disabled={updateStatus.isPending}
                          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-black/5 transition-colors ${STATUS_COLORS[item.status]} disabled:opacity-50`}
                        >
                          <StatusIcon status={item.status} />
                          {STATUS_LABELS[item.status]}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedItem === item.id && (
                    <tr key={`${item.id}-log`}>
                      <td colSpan={4} className="bg-surface-secondary px-4 py-3">
                        <div className="space-y-3">
                          {/* Комментарий к позиции */}
                          {item.comment && (
                            <div className="flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="mt-0.5 size-4 shrink-0 text-accent-blue"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 0 1-4.083-.98L2 17l1.338-2.566A6.973 6.973 0 0 1 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7ZM7 9H5v2h2V9Zm8 0h-2v2h2V9Zm-4 0H9v2h2V9Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="text-foreground">{item.comment}</span>
                            </div>
                          )}

                          {/* История изменений */}
                          {item.statusLogs.length === 0 ? (
                            <p className="text-xs text-text-secondary">
                              История изменений пуста
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {item.statusLogs.map((log) => (
                                <div
                                  key={log.id}
                                  className="flex items-center gap-3 text-xs"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${
                                        log.oldStatus
                                          ? STATUS_COLORS[log.oldStatus]
                                          : "bg-surface text-text-secondary"
                                      }`}
                                    >
                                      {log.oldStatus && (
                                        <StatusIcon status={log.oldStatus} />
                                      )}
                                      {log.oldStatus
                                        ? STATUS_LABELS[log.oldStatus]
                                        : "—"}
                                    </span>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                      className="size-3.5 shrink-0 text-text-secondary"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${STATUS_COLORS[log.newStatus]}`}
                                    >
                                      <StatusIcon status={log.newStatus} />
                                      {STATUS_LABELS[log.newStatus]}
                                    </span>
                                  </div>
                                  <span className="text-text-secondary">
                                    {log.changedBy.name}
                                  </span>
                                  <span className="text-text-secondary">
                                    {new Date(log.changedAt).toLocaleString("ru-RU")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      ))}

      {openSelect && menuPos && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={closeMenu}
          />
          <div
            className="fixed z-40 w-56 rounded-lg border border-border bg-surface py-1 shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {STATUS_ORDER.map((s) => {
              const item = orders
                .flatMap((o) => o.items)
                .find((i) => i.id === openSelect);
              return (
                <button
                  key={s}
                  onClick={() =>
                    item && handleStatusChange(item.id, item.orderId, s)
                  }
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-surface-secondary ${
                    item?.status === s
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
    </div>
  );
}
