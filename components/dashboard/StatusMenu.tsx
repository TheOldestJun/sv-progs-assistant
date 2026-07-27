/*
 * StatusMenu — выпадающее меню выбора статуса.
 * Позиционируется с учётом границ экрана (не вылезает за края).
 */
"use client";

import type { OrderItemStatus } from "@prisma/client";
import { STATUS_LABELS, STATUS_ORDER } from "@/hooks/useOrders";
import { StatusIcon } from "@/components/dashboard/StatusIcon";

export function getStatusChoices(currentStatus: OrderItemStatus, warehouseMode: boolean, showDirectorateOptions: boolean): OrderItemStatus[] {
  if (warehouseMode) {
    return ["RECEIVED", "SENT_TO_REQUESTER", "ORDER_CONFIRMED"];
  }

  // Предварительные статусы — только следующий шаг
  if (currentStatus === "PENDING_DIRECTORATE") {
    return showDirectorateOptions ? ["DIRECTORATE_APPROVED"] : [];
  }
  if (currentStatus === "DIRECTORATE_APPROVED") {
    return showDirectorateOptions ? ["ACCEPTED"] : [];
  }

  // Основной флоу: все статусы кроме складских и директоратских (если нет прав)
  return STATUS_ORDER.filter((s) => {
    if (s === "RECEIVED" || s === "SENT_TO_REQUESTER" || s === "ORDER_CONFIRMED") return false;
    if (!showDirectorateOptions && (s === "PENDING_DIRECTORATE" || s === "DIRECTORATE_APPROVED")) return false;
    return true;
  });
}

interface StatusMenuProps {
  openItemId: string;
  position: { top: number; left: number };
  warehouseMode: boolean;
  showDirectorateOptions?: boolean;
  itemsMap: Map<string, { id: string; orderId: string; status: OrderItemStatus; product: { title: string } }>;
  onSelect: (itemId: string, orderId: string, currentStatus: OrderItemStatus, targetStatus: OrderItemStatus, productTitle: string) => void;
  onClose: () => void;
}

export function StatusMenu({
  openItemId,
  position,
  warehouseMode,
  showDirectorateOptions = false,
  itemsMap,
  onSelect,
  onClose,
}: StatusMenuProps) {
  const item = openItemId ? itemsMap.get(openItemId) : undefined;
  const choices = item ? getStatusChoices(item.status, warehouseMode, showDirectorateOptions) : [];

  if (choices.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="fixed z-40 w-56 rounded-lg border border-border bg-surface py-1 shadow-lg"
        style={{ top: position.top, left: position.left }}
      >
        {choices.map((s) => (
          <button
            key={s}
            onClick={() =>
              item && onSelect(item.id, item.orderId, item.status, s, item.product.title)
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
        ))}
      </div>
    </>
  );
}
