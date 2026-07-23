/*
 * StatusChangeDialog — модальное окно подтверждения смены статуса позиции.
 * Содержит DatePicker для указания даты изменения.
 * Стилизовано под цвет целевого статуса.
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { DatePicker } from "@/components/ui/DatePicker";
import { STATUS_LABELS, type OrderItemStatus } from "@/hooks/useOrders";

const STATUS_ICONS: Record<OrderItemStatus, string> = {
  ACCEPTED:
    "M6 2.75A.75.75 0 0 1 6.75 2h6.5a.75.75 0 0 1 0 1.5h-2.5v1.75c0 .69-.56 1.25-1.25 1.25h-1.5a.75.75 0 0 1 0-1.5h.5V3.5h-2A.75.75 0 0 1 6 2.75ZM6 7a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 6 7Zm0 3a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 6 10Zm6 2.25a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5h3.5Z M11.5 15.25a.75.75 0 0 0 0 1.5h.75a.75.75 0 0 0 0-1.5h-.75Z M3.5 3.5A1.5 1.5 0 0 0 2 5v10a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V5a1.5 1.5 0 0 0-1.5-1.5h-8Zm0 1.5h8a.25.25 0 0 1 .25.25v10a.25.25 0 0 1-.25.25h-8a.25.25 0 0 1-.25-.25V5a.25.25 0 0 1 .25-.25Z",
  INVOICE_RECEIVED:
    "M4.5 2A1.5 1.5 0 0 0 3 3.5v13.256c0 .72.514 1.338 1.215 1.482a7.516 7.516 0 0 0 3.57-.372 7.5 7.5 0 0 1 4.43 0 7.516 7.516 0 0 0 3.57.372c.701-.144 1.215-.762 1.215-1.482V3.5A1.5 1.5 0 0 0 15.5 2h-11Zm3.75 3.75a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1 0-1.5h2.5ZM7 8.5a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 7 8.5Zm-1.5 3.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z",
  INVOICE_PAID:
    "M2.5 4A1.5 1.5 0 0 0 1 5.5V6h18v-.5A1.5 1.5 0 0 0 17.5 4h-15ZM1 10.25V14a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 19 14v-3.75h-4.5a2.5 2.5 0 0 1-5 0H1Zm15.5 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z M11.5 10.25a1.5 1.5 0 0 1-3 0H1V7h18v3.25h-7.5Z",
  SHIPPED:
    "M6.5 3c-1.051 0-2.093.04-3.125.117A1.49 1.49 0 0 0 2 4.607V10.5h4.75a.75.75 0 0 1 .75.75v3.25h1.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75V12H3.5v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463C4.286 3.07 5.436 3 6.5 3ZM17.5 4.607c0-.72-.514-1.34-1.223-1.463A24.7 24.7 0 0 0 12.5 3c-1.064 0-2.116.033-3.152.115C8.173 3.206 7.5 3.976 7.5 4.726V10.5h3.75a.75.75 0 0 1 .75.75v3.25h.625a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75V12H10v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463A24.7 24.7 0 0 1 12.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V12h-2.25v2.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H9V12H2.5v2.25a.75.75 0 0 1-1.5 0V4.607c0-.72.514-1.34 1.223-1.463C3.286 3.07 4.436 3 5.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V10.5h3.75a.75.75 0 0 1 .75.75v3.25h.625a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75V12H10v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463A24.7 24.7 0 0 1 12.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V12h-2.25v2.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H9V12H2.5v2.25a.75.75 0 0 1-1.5 0V4.607c0-.72.514-1.34 1.223-1.463C3.286 3.07 4.436 3 5.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V10.5h3.75a.75.75 0 0 1 .75.75v3.25h.625a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75V12H10v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463A24.7 24.7 0 0 1 12.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V12h-2.25v2.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H9V12H2.5v2.25a.75.75 0 0 1-1.5 0V4.607c0-.72.514-1.34 1.223-1.463C3.286 3.07 4.436 3 5.5 3Z",
  RECEIVED:
    "M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 0 0-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 0 0 0-1.5H5.378A2.25 2.25 0 0 1 7.5 15h11.218a.75.75 0 0 0 .674-.421 60.358 60.358 0 0 0 2.96-7.228.75.75 0 0 0-.525-.965A60.864 60.864 0 0 0 5.68 4.509l-.232-.867A1.875 1.875 0 0 0 3.636 2.25H2.25ZM6.75 17.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM15.75 17.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  SENT_TO_REQUESTER:
    "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  ORDER_CONFIRMED:
    "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
};

/** Маппинг статуса на цвета кнопки подтверждения */
const CONFIRM_BUTTON_COLORS: Record<OrderItemStatus, string> = {
  ACCEPTED: "bg-blue-600 hover:bg-blue-700",
  INVOICE_RECEIVED: "bg-amber-600 hover:bg-amber-700",
  INVOICE_PAID: "bg-violet-600 hover:bg-violet-700",
  SHIPPED: "bg-cyan-600 hover:bg-cyan-700",
  RECEIVED: "bg-green-600 hover:bg-green-700",
  SENT_TO_REQUESTER: "bg-orange-600 hover:bg-orange-700",
  ORDER_CONFIRMED: "bg-emerald-600 hover:bg-emerald-700",
};

const STATUS_BADGE_COLORS: Record<OrderItemStatus, string> = {
  ACCEPTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  INVOICE_RECEIVED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  INVOICE_PAID: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  SHIPPED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  RECEIVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  SENT_TO_REQUESTER: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  ORDER_CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

function StatusIcon({ status, className }: { status: OrderItemStatus; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className || "size-4 shrink-0"}>
      <path fillRule="evenodd" d={STATUS_ICONS[status]} clipRule="evenodd" />
    </svg>
  );
}

interface StatusChangeDialogProps {
  open: boolean;
  /** Название продукта */
  productTitle: string;
  /** Текущий статус */
  currentStatus: OrderItemStatus;
  /** Целевой статус */
  targetStatus: OrderItemStatus;
  /** ID заказа */
  orderId: string;
  /** ID позиции */
  itemId: string;
  onConfirm: (changedAt: string) => void;
  onCancel: () => void;
}

export function StatusChangeDialog({
  open,
  productTitle,
  currentStatus,
  targetStatus,
  onConfirm,
  onCancel,
}: StatusChangeDialogProps) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onCancel]);

  function handleConfirm() {
    setSubmitting(true);
    onConfirm(date);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-dialog-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-md animate-fade-in overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800 dark:text-gray-100"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                STATUS_BADGE_COLORS[targetStatus]
              }`}
            >
              <StatusIcon status={targetStatus} />
            </span>

            <div className="min-w-0 flex-1">
              <h2
                id="status-dialog-title"
                className="text-base font-semibold text-foreground"
              >
                Подтвердите смену статуса
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {productTitle}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_COLORS[currentStatus]}`}>
                  <StatusIcon status={currentStatus} className="size-3.5" />
                  {STATUS_LABELS[currentStatus]}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 text-text-secondary">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
                </svg>
                <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_COLORS[targetStatus]}`}>
                  <StatusIcon status={targetStatus} className="size-3.5" />
                  {STATUS_LABELS[targetStatus]}
                </span>
              </div>

              <div className="mt-5">
                <DatePicker
                  label="Дата смены статуса"
                  value={date}
                  onChange={setDate}
                  portal
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border bg-surface-secondary px-6 py-4">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-white transition-colors disabled:opacity-50 ${CONFIRM_BUTTON_COLORS[targetStatus]}`}
          >
            {submitting ? "Сохранение..." : STATUS_LABELS[targetStatus]}
          </button>
        </div>
      </div>
    </div>
  );
}
