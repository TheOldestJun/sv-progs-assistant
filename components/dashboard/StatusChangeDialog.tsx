/*
 * StatusChangeDialog — модальное окно подтверждения смены статуса позиции.
 * Содержит DatePicker для указания даты изменения.
 * Стилизовано под цвет целевого статуса.
 */
"use client";

import { useState, useRef } from "react";
import { DatePicker } from "@/components/ui/DatePicker";
import { STATUS_LABELS, type OrderItemStatus } from "@/hooks/useOrders";
import { getLocalDateISO } from "@/app/lib/format";
import { STATUS_BADGE_COLORS, CONFIRM_BUTTON_COLORS } from "@/app/lib/orderStatuses";
import { StatusIcon } from "./StatusIcon";
import { useFocusTrap } from "@/components/ui/useFocusTrap";

interface StatusChangeDialogProps {
  open: boolean;
  productTitle: string;
  currentStatus: OrderItemStatus;
  targetStatus: OrderItemStatus;
  orderId: string;
  itemId: string;
  requesterMode?: boolean;
  onConfirm: (changedAt: string) => void;
  onCancel: () => void;
}

export function StatusChangeDialog({
  open,
  productTitle,
  currentStatus,
  targetStatus,
  requesterMode = false,
  onConfirm,
  onCancel,
}: StatusChangeDialogProps) {
  // Локальная дата, а не UTC: toISOString() в UTC+2/+3 до 02:59 даёт «вчера»
  const [date, setDate] = useState(() => getLocalDateISO());
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Focus-trap: фокус не уходит из диалога, Escape закрывает, фокус возвращается
  useFocusTrap(open, dialogRef, onCancel);

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
                  {/* Заявитель видит «Отправить в работу» вместо «Принято в работу» */}
                  {requesterMode && targetStatus === "ACCEPTED"
                    ? "Отправить в работу"
                    : STATUS_LABELS[targetStatus]}
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
            {submitting
              ? "Сохранение..."
              : requesterMode && targetStatus === "ACCEPTED"
                ? "Отправить в работу"
                : STATUS_LABELS[targetStatus]}
          </button>
        </div>
      </div>
    </div>
  );
}
