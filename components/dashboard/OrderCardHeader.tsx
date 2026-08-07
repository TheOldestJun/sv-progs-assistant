/*
 * OrderCardHeader — заголовок карточки заявки: имя заявителя, дата,
 * общее количество единиц, кнопка удаления (архивирования), пакетного
 * одобрения директором и пакетного принятия в работу.
 */
"use client";

import { IconTrash } from "@/components/ui/Icon";

interface OrderCardHeaderProps {
  requesterName: string;
  created: string;
  totalQuantity: number;
  readOnly: boolean;
  allFinished: boolean;
  deletePending: boolean;
  onDelete: () => void;
  showApprove?: boolean;
  approvePending?: boolean;
  onApprove?: () => void;
  showAccept?: boolean;
  acceptPending?: boolean;
  onAccept?: () => void;
  showExcel?: boolean;
  excelPending?: boolean;
  onExcel?: () => void;
}

export function OrderCardHeader({
  requesterName,
  created,
  totalQuantity,
  readOnly,
  allFinished,
  deletePending,
  onDelete,
  showApprove,
  approvePending,
  onApprove,
  showAccept,
  acceptPending,
  onAccept,
  showExcel,
  excelPending,
  onExcel,
}: OrderCardHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 bg-surface-secondary px-4 py-3 sm:gap-4 sm:py-1">
      <div className="flex items-center gap-2 text-sm sm:gap-4">
        <span className="font-medium text-foreground">
          {requesterName}
        </span>
        <span className="text-text-secondary">
          {new Date(created).toLocaleDateString("ru-RU")}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-text-secondary">
          {totalQuantity} ед.
        </span>
        {showApprove && onApprove && (
          <button
            onClick={onApprove}
            disabled={approvePending}
            className="inline-flex h-7 items-center gap-1 rounded-md bg-green-600 px-2 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50 max-sm:min-h-11"
            title="Одобрить все позиции заявки"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
            Одобрить
          </button>
        )}
        {showAccept && onAccept && (
          <button
            onClick={onAccept}
            disabled={acceptPending}
            className="inline-flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 max-sm:min-h-11"
            title="Принять все одобренные позиции в работу"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
              <path d="M6 2.75A.75.75 0 0 1 6.75 2h6.5a.75.75 0 0 1 0 1.5h-2.5v1.75c0 .69-.56 1.25-1.25 1.25h-1.5a.75.75 0 0 1 0-1.5h.5V3.5h-2A.75.75 0 0 1 6 2.75ZM6 7a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 6 7Zm0 3a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 6 10Zm6 2.25a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5h3.5Z" />
            </svg>
            Принять в работу
          </button>
        )}
        {showExcel && onExcel && (
          <button
            onClick={onExcel}
            disabled={excelPending}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50 max-sm:min-h-11"
            title="Скачать заявку в Excel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Скачать Excel
          </button>
        )}
        {!readOnly && (
          <button
            onClick={onDelete}
            disabled={deletePending || !allFinished}
            className="group flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950 dark:hover:text-red-400 max-sm:min-h-11 max-sm:min-w-11"
            title={
              allFinished
                ? "Удалить заявку"
                : "Удаление доступно после завершения всех позиций"
            }
          >
            <IconTrash className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
