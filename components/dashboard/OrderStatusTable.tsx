/*
 * OrderStatusTable — таблица заявок с управлением статусами позиций.
 * - Отображает все заявки, сгруппированные по дате (свежие сверху)
 * - Каждая позиция имеет статус, который можно менять через выпадающий список
 * - Расширяемая история изменений (statusLogs) при клике на позицию
 *
 * Режимы (props):
 * - warehouseMode: склад видит RECEIVED / SENT_TO_REQUESTER / ORDER_CONFIRMED
 * - requesterMode: заявитель видит свой заказ, для позиций SENT_TO_REQUESTER
 *   отображается кнопка «Подтвердить接收ение» (SENT_TO_REQUESTER → ORDER_CONFIRMED)
 * - readOnly: только просмотр без возможности изменения статусов
 *
 * Используется в SupplyDeptDashboard, HeadOfSupplyDashboard,
 * WarehouseDashboard (warehouseMode), RequesterDashboard (requesterMode).
 */
"use client";

import { useMemo, useState } from "react";
import * as React from "react";
import { useOrders, useUpdateOrderItemStatus, fetchItemLogs, STATUS_LABELS, STATUS_ORDER, type OrderItemStatus, type StatusLogEntry } from "@/hooks/useOrders";
import { useDeleteOrder } from "@/hooks/useDeleteOrder";
import { useToast } from "@/components/ui/Toast";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconSearch, IconTrash } from "@/components/ui/Icon";
import { StatusChangeDialog } from "@/components/dashboard/StatusChangeDialog";
import { EditProductDialog } from "@/components/dashboard/EditProductDialog";
import { Tooltip } from "@/components/ui/Tooltip";

const FINAL_STATUSES = new Set(["RECEIVED", "SENT_TO_REQUESTER", "ORDER_CONFIRMED"]);

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<OrderItemStatus, string> = {
  ACCEPTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  INVOICE_RECEIVED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  INVOICE_PAID: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  SHIPPED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  RECEIVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  SENT_TO_REQUESTER: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  ORDER_CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
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
    case "SENT_TO_REQUESTER":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cls}>
          <path d="M3 3.25c0-1.036.84-1.875 1.875-1.875h9.75c1.036 0 1.875.84 1.875 1.875v9.75a1.875 1.875 0 0 1-1.875 1.875H12v2.25A2.75 2.75 0 0 1 9.25 18h-6A2.75 2.75 0 0 1 .5 15.25V5.75c0-1.519 1.231-2.75 2.75-2.75h11A2.75 2.75 0 0 1 17 5.75v2.25h-2.25V3.75a.375.375 0 0 0-.375-.375H3.375a.375.375 0 0 0-.375.375Z" />
          <path d="M13 7.5h-1.5v4.25a.75.75 0 0 1-1.5 0V7.5H8.25a.75.75 0 0 1 0-1.5H10V1.75a.75.75 0 0 1 1.5 0V6H13.25a.75.75 0 0 1 0 1.5Z" />
        </svg>
      );
    case "ORDER_CONFIRMED":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cls}>
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        </svg>
      );
  }
}

// Какие статусы показывать в меню переключения:
// - default (отдел снабжения): все до RECEIVED (склад принимает товары)
// - warehouse (склад): RECEIVED, SENT_TO_REQUESTER, ORDER_CONFIRMED
const STATUS_CHOICES: Record<string, OrderItemStatus[]> = {
  default: STATUS_ORDER.filter((s) => s !== "RECEIVED" && s !== "SENT_TO_REQUESTER" && s !== "ORDER_CONFIRMED"),
  warehouse: ["RECEIVED", "SENT_TO_REQUESTER", "ORDER_CONFIRMED"],
};

export function OrderStatusTable({ warehouseMode = false, readOnly = false, requesterMode = false }: { warehouseMode?: boolean; readOnly?: boolean; requesterMode?: boolean }) {
  const { data: orders, isLoading, isError, error } = useOrders();
  const updateStatus = useUpdateOrderItemStatus();
  const deleteOrder = useDeleteOrder();
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [logsMap, setLogsMap] = useState<Record<string, StatusLogEntry[]>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const statusChoices = warehouseMode ? STATUS_CHOICES.warehouse : STATUS_CHOICES.default;

  // Состояние диалога подтверждения смены статуса
  const [pendingChange, setPendingChange] = useState<{
    itemId: string;
    orderId: string;
    targetStatus: OrderItemStatus;
    currentStatus: OrderItemStatus;
    productTitle: string;
  } | null>(null);

  // Состояние диалога редактирования ТМЦ
  const [editingProduct, setEditingProduct] = useState<{
    itemId: string;
    orderId: string;
    productId: string;
    productTitle: string;
  } | null>(null);

  // Токен подтверждения для копирования ссылки
  const [confirmLink, setConfirmLink] = useState<{
    token: string;
    orderId: string;
  } | null>(null);

  function openMenu(itemId: string, buttonEl: HTMLButtonElement) {
    if (openSelect === itemId) {
      setOpenSelect(null);
      setMenuPos(null);
      return;
    }
    const rect = buttonEl.getBoundingClientRect();
    const menuWidth = 224; // w-56 = 224px — если меняешь ширину меню, обнови и тут
    const menuHeight = statusChoices.length * 36 + 16; // ~36px на пункт + отступы
    // Если меню вылезает за правый край экрана — сдвигаем влево
    const left = rect.left + menuWidth > window.innerWidth
      ? window.innerWidth - menuWidth - 8
      : rect.left;
    // Если меню вылезает за нижний край — показываем сверху
    const top = rect.bottom + 4 + menuHeight > window.innerHeight
      ? rect.top - menuHeight
      : rect.bottom + 4;
    setMenuPos({ top, left });
    setOpenSelect(itemId);
  }

  function closeMenu() {
    setOpenSelect(null);
    setMenuPos(null);
  }

  function toggleItem(itemId: string, orderId: string) {
    if (expandedItem === itemId) {
      setExpandedItem(null);
      return;
    }
    setExpandedItem(itemId);
    // Ленивая загрузка логов, если ещё не загружены
    if (!logsMap[itemId]) {
      fetchItemLogs(orderId, itemId)
        .then((logs) => setLogsMap((prev) => ({ ...prev, [itemId]: logs })))
        .catch(() => {
          // При ошибке показываем пустой массив
          setLogsMap((prev) => ({ ...prev, [itemId]: [] }));
        });
    }
  }

  function handleStatusClick(itemId: string, orderId: string, currentStatus: OrderItemStatus, targetStatus: OrderItemStatus, productTitle: string) {
    closeMenu();
    setPendingChange({ itemId, orderId, targetStatus, currentStatus, productTitle });
  }

  function handleStatusConfirm(changedAt: string) {
    if (!pendingChange) return;
    updateStatus.mutate(
      { orderId: pendingChange.orderId, itemId: pendingChange.itemId, status: pendingChange.targetStatus, warehouseMode, changedAt },
      {
        onSuccess: (data: { confirmationToken?: string }) => {
          showToast(`Статус изменён на «${STATUS_LABELS[pendingChange.targetStatus]}»`, "success");
          // Если перевели в SENT_TO_REQUESTER — сохраняем токен для копирования ссылки
          if (data.confirmationToken) {
            setConfirmLink({ token: data.confirmationToken, orderId: pendingChange.orderId });
          }
          setPendingChange(null);
        },
        onError: (err) => {
          showToast(err.message, "error");
          setPendingChange(null);
        },
      },
    );
  }

  function handleStatusCancel() {
    setPendingChange(null);
  }

  async function handleDeleteOrder(orderId: string) {
    const ok = await confirm({
      title: "Архивирование заявки",
      message: "Заявка будет перемещена в архив. Вы сможете просмотреть её на вкладке «Архив».",
      confirmText: "Архивировать",
      variant: "danger",
    });
    if (!ok) return;
    deleteOrder.mutate(orderId, {
      onSuccess: () => showToast("Заявка удалена", "success"),
      onError: (err) => showToast(err.message, "error"),
    });
  }

  const filtered = useMemo(() => {
    if (!orders) return [];
    let result = orders;
    // В режиме склада показываем позиции, которые требуют действий склада:
    // SHIPPED (для приёмки), RECEIVED (для отправки заявителю), SENT_TO_REQUESTER (для подтверждения)
    if (warehouseMode) {
      const warehouseStatuses = new Set(["SHIPPED", "RECEIVED", "SENT_TO_REQUESTER"]);
      result = result
        .map((o) => ({
          ...o,
          items: o.items.filter((it) => warehouseStatuses.has(it.status)),
        }))
        .filter((o) => o.items.length > 0);
    }
    // Поиск по имени заявителя или названию продукта
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(
      (o) =>
        o.requester.name.toLowerCase().includes(q) ||
        o.items.some((it) => it.product.title.toLowerCase().includes(q)),
    );
  }, [orders, search, warehouseMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  // itemsMap — O(1) lookup for status menu instead of scanning all items each time
  const itemsMap = useMemo(() => {
    type OrderItem = NonNullable<typeof orders>[number]["items"][number];
    const map = new Map<string, OrderItem>();
    if (!orders) return map;
    for (const o of orders) {
      for (const item of o.items) {
        map.set(item.id, item);
      }
    }
    return map;
  }, [orders]);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

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
    <div className="space-y-4 sm:space-y-1">
      {/* Поиск */}
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Поиск по заявителю или продукту..."
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {paged.map((order) => (
        <div
          key={order.id}
          className="overflow-hidden rounded-lg border border-border"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 bg-surface-secondary px-4 py-3 sm:gap-4 sm:py-1">
            <div className="flex items-center gap-2 text-sm sm:gap-4">
              <span className="font-medium text-foreground">
                {order.requester.name}
              </span>
              <span className="text-text-secondary">
                {new Date(order.created).toLocaleDateString("ru-RU")}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-text-secondary">
                {order.items.reduce((s, it) => s + it.quantity, 0)} ед.
              </span>
              {!readOnly && (
                <button
                  onClick={() => handleDeleteOrder(order.id)}
                  disabled={deleteOrder.isPending || !order.items.every((it) => FINAL_STATUSES.has(it.status))}
                  className="group flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950 dark:hover:text-red-400 max-sm:min-h-11 max-sm:min-w-11"
                  title={
                    order.items.every((it) => FINAL_STATUSES.has(it.status))
                      ? "Удалить заявку"
                      : "Удаление доступно после завершения всех позиций"
                  }
                >
                  <IconTrash className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-sm:border-t max-sm:border-border">
            <table className="w-full min-w-0 text-sm">
            <thead className="bg-surface max-sm:hidden">
              <tr>
                <th className="px-2 py-1.5 sm:px-4 sm:py-0.5 text-left font-medium text-text-secondary">ТМЦ</th>
                <th className="w-16 px-2 py-1.5 sm:px-4 sm:py-0.5 text-left font-medium text-text-secondary">Ед.</th>
                <th className="w-20 px-2 py-1.5 sm:px-4 sm:py-0.5 text-right font-medium text-text-secondary">Кол-во</th>
                <th className="w-44 px-2 py-1.5 sm:px-4 sm:py-0.5 text-left font-medium text-text-secondary">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.items.map((item) => (
                  <React.Fragment key={item.id}>
                  <tr className="hover:bg-surface max-sm:flex max-sm:flex-col max-sm:border-b max-sm:border-border max-sm:px-4 max-sm:py-2.5 max-sm:gap-1 max-sm:last:border-b-0">
                    <td className="px-2 py-1.5 sm:px-4 sm:py-0.5 max-sm:flex max-sm:items-center max-sm:gap-2 max-sm:p-0">
                      <span className="text-xs text-text-secondary sm:hidden shrink-0">ТМЦ:</span>
                      <button
                        onClick={() => toggleItem(item.id, order.id)}
                        className="flex max-sm:min-h-11 items-start gap-1.5 text-left text-foreground transition-colors hover:text-primary"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className={`mt-0.5 size-3.5 shrink-0 transition-transform ${
                            expandedItem === item.id ? "rotate-90" : ""
                          }`}
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="min-w-0 flex-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <Tooltip text={item.product.title}>
                            <span className="break-words">{item.product.title}</span>
                          </Tooltip>
                          {!readOnly && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProduct({
                                  itemId: item.id,
                                  orderId: order.id,
                                  productId: item.productId,
                                  productTitle: item.product.title,
                                });
                              }}
                              className="inline-flex cursor-pointer items-center justify-center rounded-md p-0.5 text-text-secondary transition-colors hover:text-primary"
                              title="Редактировать ТМЦ"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                                <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65z" />
                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                              </svg>
                            </span>
                          )}
                          {item.comment && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="size-3.5 text-accent-blue shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 0 1-4.083-.98L2 17l1.338-2.566A6.973 6.973 0 0 1 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7ZM7 9H5v2h2V9Zm8 0h-2v2h2V9Zm-4 0H9v2h2V9Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </span>
                      </button>
                    </td>
                     <td className="w-16 px-2 py-1.5 sm:px-4 sm:py-0.5 text-text-secondary max-sm:hidden">
                       {item.units.title}
                     </td>
                     <td className="w-20 px-2 py-1.5 sm:px-4 sm:py-0.5 text-right text-foreground max-sm:hidden">
                       {item.quantity}
                     </td>
                     <td className="sm:w-44 px-2 py-1.5 sm:px-4 sm:py-0.5 max-sm:flex max-sm:items-center max-sm:gap-2 max-sm:border-0 max-sm:p-0">
                      <span className="text-xs text-text-secondary sm:hidden shrink-0">Кол-во:</span>
                      <span className="sm:hidden text-xs text-text-secondary tabular-nums whitespace-nowrap">
                        {item.quantity} {item.units.title}
                      </span>
                      <span className="hidden sm:inline">
                        {(readOnly && !(requesterMode && item.status === "SENT_TO_REQUESTER")) ? (
                          <span className="inline-flex max-sm:min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-black/5 ${STATUS_COLORS[item.status]}">
                            <StatusIcon status={item.status} />
                            {STATUS_LABELS[item.status]}
                          </span>
                        ) : requesterMode && item.status === "SENT_TO_REQUESTER" ? (
                          <button
                            onClick={() =>
                              setPendingChange({
                                itemId: item.id,
                                orderId: item.orderId,
                                targetStatus: "ORDER_CONFIRMED" as OrderItemStatus,
                                currentStatus: item.status,
                                productTitle: item.product.title,
                              })
                            }
                            disabled={updateStatus.isPending}
                            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                            </svg>
                            Подтвердить получение
                          </button>
                        ) : (
                          <div className="relative inline-flex">
                            <button
                              onClick={(e) => {
                                if (item.status !== "ORDER_CONFIRMED") openMenu(item.id, e.currentTarget);
                              }}
                              disabled={updateStatus.isPending}
                              className={`inline-flex max-sm:min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-black/5 transition-colors ${STATUS_COLORS[item.status]} disabled:opacity-50 ${item.status === "ORDER_CONFIRMED" ? "cursor-default" : "cursor-pointer"}`}
                            >
                              <StatusIcon status={item.status} />
                              {STATUS_LABELS[item.status]}
                            </button>
                          </div>
                        )}
                      </span>
                    </td>
                  </tr>
                  {/* Mobile status row — below product+qty */}
                  <tr className="max-sm:flex max-sm:px-4 max-sm:pb-2.5 sm:hidden">
                    <td colSpan={4} className="max-sm:p-0">
                      <span className="text-xs text-text-secondary">Статус:</span>
                      <div className="mt-1">
                      {(readOnly && !(requesterMode && item.status === "SENT_TO_REQUESTER")) ? (
                        <span className="inline-flex max-sm:min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium max-sm:w-full max-sm:justify-center max-sm:px-3 max-sm:py-1.5 max-sm:text-sm ring-1 ring-inset ring-black/5 ${STATUS_COLORS[item.status]}">
                          <StatusIcon status={item.status} />
                          {STATUS_LABELS[item.status]}
                        </span>
                      ) : requesterMode && item.status === "SENT_TO_REQUESTER" ? (
                        <button
                          onClick={() =>
                            setPendingChange({
                              itemId: item.id,
                              orderId: item.orderId,
                              targetStatus: "ORDER_CONFIRMED" as OrderItemStatus,
                              currentStatus: item.status,
                              productTitle: item.product.title,
                            })
                          }
                          disabled={updateStatus.isPending}
                          className="inline-flex w-full max-sm:min-h-11 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                          </svg>
                          Подтвердить получение
                        </button>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              if (item.status !== "ORDER_CONFIRMED") openMenu(item.id, e.currentTarget);
                            }}
                            disabled={updateStatus.isPending}
                            className={`inline-flex max-sm:min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium max-sm:w-full max-sm:justify-center max-sm:px-3 max-sm:py-1.5 max-sm:text-sm ring-1 ring-inset ring-black/5 transition-colors ${STATUS_COLORS[item.status]} disabled:opacity-50 ${item.status === "ORDER_CONFIRMED" ? "cursor-default" : "cursor-pointer"}`}
                          >
                            <StatusIcon status={item.status} />
                            {STATUS_LABELS[item.status]}
                          </button>
                        </div>
                      )}
                      </div>
                    </td>
                  </tr>
                  {expandedItem === item.id && (
                    <tr key={`${item.id}-log`} className="max-sm:flex max-sm:flex-col max-sm:px-4 max-sm:py-2.5">
                      <td colSpan={4} className="bg-surface-secondary px-3 py-2 sm:px-4 sm:py-3 max-sm:p-0">
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
                          {(() => {
                            const logs = logsMap[item.id] ?? item.statusLogs ?? [];
                            if (logs.length === 0) {
                              return (
                                <p className="text-xs text-text-secondary">
                                  История изменений пуста
                                </p>
                              );
                            }
                            return (
                              <div className="space-y-2">
                                {logs.map((log) => (
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
                                    {new Date(log.changedAt).toLocaleDateString("ru-RU")}
                                  </span>
                                </div>
                                ))}
                            </div>
                          );
                          })()}
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

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 text-sm text-text-secondary">
          <span>
            {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} из {filtered.length}
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

      {pendingChange && (
        <StatusChangeDialog
          open
          productTitle={pendingChange.productTitle}
          currentStatus={pendingChange.currentStatus}
          targetStatus={pendingChange.targetStatus}
          orderId={pendingChange.orderId}
          itemId={pendingChange.itemId}
          onConfirm={handleStatusConfirm}
          onCancel={handleStatusCancel}
        />
      )}

      {editingProduct && (
        <EditProductDialog
          open
          productId={editingProduct.productId}
          productTitle={editingProduct.productTitle}
          orderId={editingProduct.orderId}
          itemId={editingProduct.itemId}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {/* Диалог копирования ссылки подтверждения для заявителя */}
      {confirmLink && (
        <>
          <div className="fixed inset-0 z-30 bg-black/50" onClick={() => setConfirmLink(null)} />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-lg">
              <h3 className="text-base font-semibold text-foreground">
                Ссылка для подтверждения
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Отправьте эту ссылку заявителю для подтверждения получения
              </p>
              <div className="mt-4 flex items-center gap-2">
                <input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/confirm/${confirmLink.token}`}
                  className="flex-1 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-foreground"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/confirm/${confirmLink.token}`,
                    );
                    showToast("Ссылка скопирована", "success");
                  }}
                  className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
                >
                  Копировать
                </button>
              </div>
              <button
                onClick={() => setConfirmLink(null)}
                className="mt-4 w-full rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-secondary"
              >
                Закрыть
              </button>
            </div>
          </div>
        </>
      )}

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
            {statusChoices.map((s) => {
              const item = openSelect ? itemsMap.get(openSelect) : undefined;
              return (
                <button
                  key={s}
                  onClick={() =>
                    item && handleStatusClick(item.id, item.orderId, item.status, s, item.product.title)
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
