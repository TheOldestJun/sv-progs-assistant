/*
 * BatchAcceptDialog — модальное окно подтверждения пакетного принятия
 * заявки в работу. Все DIRECTORATE_APPROVED позиции → ACCEPTED.
 * Аналог BatchApproveDialog, но для шага принятия в работу.
 */
"use client";

import { useState, useRef } from "react";
import { DatePicker } from "@/components/ui/DatePicker";
import { STATUS_LABELS } from "@/hooks/useOrders";
import { getLocalDateISO } from "@/app/lib/format";
import { useFocusTrap } from "@/components/ui/useFocusTrap";

export function BatchAcceptDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: (changedAt: string) => void;
  onCancel: () => void;
}) {
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
      aria-labelledby="batch-accept-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-md animate-fade-in max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800 dark:text-gray-100"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                <path d="M6 2.75A.75.75 0 0 1 6.75 2h6.5a.75.75 0 0 1 0 1.5h-2.5v1.75c0 .69-.56 1.25-1.25 1.25h-1.5a.75.75 0 0 1 0-1.5h.5V3.5h-2A.75.75 0 0 1 6 2.75ZM6 7a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 6 7Zm0 3a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 6 10Zm6 2.25a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5h3.5Z" />
              </svg>
            </span>

            <div className="min-w-0 flex-1">
              <h2
                id="batch-accept-title"
                className="text-base font-semibold text-foreground"
              >
                Пакетное принятие в работу
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Все одобренные позиции будут переведены в статус «{STATUS_LABELS.ACCEPTED}».
              </p>

              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  {STATUS_LABELS.DIRECTORATE_APPROVED}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 text-text-secondary">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
                </svg>
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {STATUS_LABELS.ACCEPTED}
                </span>
              </div>

              <div className="mt-5">
                <DatePicker label="Дата принятия в работу" value={date} onChange={setDate} portal />
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
            className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Принятие..." : "Принять в работу"}
          </button>
        </div>
      </div>
    </div>
  );
}
