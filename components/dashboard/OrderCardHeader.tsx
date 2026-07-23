/*
 * OrderCardHeader — заголовок карточки заявки: имя заявителя, дата,
 * общее количество единиц, кнопка удаления (архивирования).
 */
"use client";

import { IconTrash } from "@/components/ui/Icon";

const FINAL_STATUSES = new Set(["RECEIVED", "SENT_TO_REQUESTER", "ORDER_CONFIRMED"]);

interface OrderCardHeaderProps {
  requesterName: string;
  created: string;
  totalQuantity: number;
  readOnly: boolean;
  allFinished: boolean;
  deletePending: boolean;
  onDelete: () => void;
}

export function OrderCardHeader({
  requesterName,
  created,
  totalQuantity,
  readOnly,
  allFinished,
  deletePending,
  onDelete,
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
