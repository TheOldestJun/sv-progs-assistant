/*
 * OrderItemRow — строка позиции в таблице заявки.
 * Десктоп: ТМЦ | Ед. | Кол-во | Статус
 * Мобильная: две строки — основные данные + статус
 * При раскрытии: комментарий + история изменений
 *
 * Три режима статуса:
 * - readOnly (без requesterMode): просто бейдж
 * - requesterMode + SENT_TO_REQUESTER: кнопка «Подтвердить получение»
 * - остальные: кнопка с выпадающим меню выбора статуса
 */
"use client";

import type { OrderItemStatus } from "@prisma/client";
import type { StatusLogEntry } from "@/hooks/useOrders";
import { STATUS_LABELS } from "@/hooks/useOrders";
import { Tooltip } from "@/components/ui/Tooltip";
import { StatusIcon } from "@/components/dashboard/StatusIcon";
import { ItemStatusHistory } from "@/components/dashboard/ItemStatusHistory";

const STATUS_COLORS: Record<OrderItemStatus, string> = {
  ACCEPTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  INVOICE_RECEIVED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  INVOICE_PAID: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  SHIPPED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  RECEIVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  SENT_TO_REQUESTER: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  ORDER_CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

interface ItemData {
  id: string;
  orderId: string;
  productId: string;
  status: OrderItemStatus;
  product: { title: string };
  units: { title: string };
  quantity: number;
  comment: string | null;
  statusLogs?: StatusLogEntry[];
}

interface OrderItemRowProps {
  item: ItemData;
  readOnly: boolean;
  requesterMode: boolean;
  warehouseMode: boolean;
  expanded: boolean;
  logs: StatusLogEntry[] | undefined;
  isPending: boolean;
  onToggle: () => void;
  onOpenMenu: (buttonEl: HTMLButtonElement) => void;
  onConfirmReceipt: () => void;
  onEditProduct: () => void;
}

export function OrderItemRow({
  item,
  readOnly,
  requesterMode,
  expanded,
  logs,
  isPending,
  onToggle,
  onOpenMenu,
  onConfirmReceipt,
  onEditProduct,
}: OrderItemRowProps) {
  return (
    <>
      <tr className="hover:bg-surface max-sm:flex max-sm:flex-col max-sm:border-b max-sm:border-border max-sm:px-4 max-sm:py-2.5 max-sm:gap-1 max-sm:last:border-b-0">
        <td className="px-2 py-1.5 sm:px-4 sm:py-0.5 max-sm:flex max-sm:items-center max-sm:gap-2 max-sm:p-0">
          <span className="text-xs text-text-secondary sm:hidden shrink-0">ТМЦ:</span>
          <button
            onClick={onToggle}
            className="flex max-sm:min-h-11 items-start gap-1.5 text-left text-foreground transition-colors hover:text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`mt-0.5 size-3.5 shrink-0 transition-transform ${
                expanded ? "rotate-90" : ""
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
                    onEditProduct();
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
            {renderStatusControl()}
          </span>
        </td>
      </tr>
      <tr className="max-sm:flex max-sm:px-4 max-sm:pb-2.5 sm:hidden">
        <td colSpan={4} className="max-sm:block max-sm:w-full max-sm:p-0">
          <span className="text-xs text-text-secondary">Статус:</span>
          <div className="mt-1">
            {renderStatusControlMobile()}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="max-sm:flex max-sm:flex-col max-sm:px-4 max-sm:py-2.5">
          <td colSpan={4} className="bg-surface-secondary px-3 py-2 sm:px-4 sm:py-3 max-sm:p-0">
            <ItemStatusHistory
              comment={item.comment}
              logs={logs ?? item.statusLogs ?? []}
            />
          </td>
        </tr>
      )}
    </>
  );

  function renderStatusControl() {
    if (readOnly && !(requesterMode && item.status === "SENT_TO_REQUESTER")) {
      return (
        <span className={`inline-flex max-sm:min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-black/5 ${STATUS_COLORS[item.status]}`}>
          <StatusIcon status={item.status} />
          {STATUS_LABELS[item.status]}
        </span>
      );
    }

    if (requesterMode && item.status === "SENT_TO_REQUESTER") {
      return (
        <button
          onClick={onConfirmReceipt}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
          </svg>
          Подтвердить получение
        </button>
      );
    }

    return (
      <div className="relative inline-flex">
        <button
          onClick={(e) => {
            if (item.status !== "ORDER_CONFIRMED") onOpenMenu(e.currentTarget);
          }}
          disabled={isPending}
          className={`inline-flex max-sm:min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-black/5 transition-colors ${STATUS_COLORS[item.status]} disabled:opacity-50 ${item.status === "ORDER_CONFIRMED" ? "cursor-default" : "cursor-pointer"}`}
        >
          <StatusIcon status={item.status} />
          {STATUS_LABELS[item.status]}
        </button>
      </div>
    );
  }

  function renderStatusControlMobile() {
    if (readOnly && !(requesterMode && item.status === "SENT_TO_REQUESTER")) {
      return (
        <span className={`inline-flex max-sm:flex max-sm:min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium max-sm:w-full max-sm:justify-center max-sm:px-3 max-sm:py-1.5 max-sm:text-sm ring-1 ring-inset ring-black/5 ${STATUS_COLORS[item.status]}`}>
          <StatusIcon status={item.status} />
          {STATUS_LABELS[item.status]}
        </span>
      );
    }

    if (requesterMode && item.status === "SENT_TO_REQUESTER") {
      return (
        <button
          onClick={onConfirmReceipt}
          disabled={isPending}
          className="flex w-full max-sm:min-h-11 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
          </svg>
          Подтвердить получение
        </button>
      );
    }

    return (
      <div className="relative">
        <button
          onClick={(e) => {
            if (item.status !== "ORDER_CONFIRMED") onOpenMenu(e.currentTarget);
          }}
          disabled={isPending}
          className={`inline-flex max-sm:flex max-sm:min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium max-sm:w-full max-sm:justify-center max-sm:px-3 max-sm:py-1.5 max-sm:text-sm ring-1 ring-inset ring-black/5 transition-colors ${STATUS_COLORS[item.status]} disabled:opacity-50 ${item.status === "ORDER_CONFIRMED" ? "cursor-default" : "cursor-pointer"}`}
        >
          <StatusIcon status={item.status} />
          {STATUS_LABELS[item.status]}
        </button>
      </div>
    );
  }
}
