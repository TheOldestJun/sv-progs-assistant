"use client";

import { useState, useRef } from "react";
import { DatePicker } from "@/components/ui/DatePicker";
import { STATUS_LABELS } from "@/hooks/useOrders";
import { getLocalDateISO } from "@/app/lib/format";
import { useFocusTrap } from "@/components/ui/useFocusTrap";

export function BatchApproveDialog({
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
      aria-labelledby="batch-approve-title"
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
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
            </span>

            <div className="min-w-0 flex-1">
              <h2
                id="batch-approve-title"
                className="text-base font-semibold text-foreground"
              >
                Пакетное одобрение заявки
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Все ожидающие позиции будут переведены в статус «{STATUS_LABELS.DIRECTORATE_APPROVED}».
              </p>

              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                  </svg>
                  {STATUS_LABELS.PENDING_DIRECTORATE}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 text-text-secondary">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
                </svg>
                <span className="inline-flex items-center gap-1 rounded-md bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                  {STATUS_LABELS.DIRECTORATE_APPROVED}
                </span>
              </div>

              <div className="mt-5">
                <DatePicker label="Дата одобрения" value={date} onChange={setDate} portal />
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
            className="inline-flex h-10 items-center rounded-lg bg-teal-600 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? "Одобрение..." : "Одобрить все"}
          </button>
        </div>
      </div>
    </div>
  );
}
