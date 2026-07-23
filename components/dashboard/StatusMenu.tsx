/*
 * StatusMenu — выпадающее меню выбора статуса.
 * Позиционируется с учётом границ экрана (не вылезает за края).
 */
"use client";

import type { OrderItemStatus } from "@prisma/client";
import { STATUS_LABELS, STATUS_ORDER } from "@/hooks/useOrders";
import { StatusIcon } from "@/components/dashboard/StatusIcon";

const STATUS_CHOICES: Record<string, OrderItemStatus[]> = {
  default: STATUS_ORDER.filter((s) => s !== "RECEIVED" && s !== "SENT_TO_REQUESTER" && s !== "ORDER_CONFIRMED"),
  warehouse: ["RECEIVED", "SENT_TO_REQUESTER", "ORDER_CONFIRMED"],
};

interface StatusMenuProps {
  openItemId: string;
  position: { top: number; left: number };
  warehouseMode: boolean;
  itemsMap: Map<string, { id: string; orderId: string; status: OrderItemStatus; product: { title: string } }>;
  onSelect: (itemId: string, orderId: string, currentStatus: OrderItemStatus, targetStatus: OrderItemStatus, productTitle: string) => void;
  onClose: () => void;
}

export function StatusMenu({
  openItemId,
  position,
  warehouseMode,
  itemsMap,
  onSelect,
  onClose,
}: StatusMenuProps) {
  const choices = warehouseMode ? STATUS_CHOICES.warehouse : STATUS_CHOICES.default;
  const item = openItemId ? itemsMap.get(openItemId) : undefined;

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
