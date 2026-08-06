/*
 * ArchiveItemDetails — общие типы и отображение истории статусов для архивных заявок.
 * Архив хранит снимок ТМЦ (productTitle/unitTitle) и полную историю смены статусов
 * (ArchivedOrderItemStatusLog) с датами и именем исполнителя.
 */
import type { OrderItemStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/hooks/useOrders";
import { StatusIcon } from "@/components/dashboard/StatusIcon";

export interface ArchivedStatusLog {
  id: string;
  oldStatus: OrderItemStatus | null;
  newStatus: OrderItemStatus;
  changedAt: string;
  changedByName: string | null;
}

export interface ArchivedItem {
  id: string;
  productId: string | null;
  productTitle: string;
  unitTitle: string;
  quantity: number;
  comment: string | null;
  finalStatus: OrderItemStatus;
  statusLogs: ArchivedStatusLog[];
}

// Статусы в архиве показываем монохромом (серым) — заявка уже завершена,
// цветовая семантика актуальных статусов здесь не нужна.
export const ARCHIVE_STATUS_STYLE =
  "bg-neutral-300 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100";

/** Компактный бейдж финального статуса позиции архива (монохромный) */
export function ArchiveStatusBadge({ status }: { status: OrderItemStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${ARCHIVE_STATUS_STYLE}`}
    >
      <StatusIcon status={status} />
      {STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Раскрываемая история смены статусов одной архивной позиции:
 * старая → новая, дата, кто изменил (снимок имени на момент изменения).
 */
export function ArchiveItemHistory({ item }: { item: ArchivedItem }) {
  return (
    <div className="space-y-2 bg-surface-secondary/50 px-4 py-3">
      {item.comment && (
        <p className="text-xs text-text-secondary">
          <span className="font-medium text-foreground">Комментарий: </span>
          {item.comment}
        </p>
      )}
      {item.statusLogs.length === 0 ? (
        <p className="text-xs text-text-secondary">
          История статусов недоступна (заявка архивирована до введения этой функции)
        </p>
      ) : (
        <div className="space-y-1.5">
          {item.statusLogs.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${
                  log.oldStatus ? ARCHIVE_STATUS_STYLE : "bg-surface text-text-secondary"
                }`}
              >
                {log.oldStatus && <StatusIcon status={log.oldStatus} />}
                {log.oldStatus ? STATUS_LABELS[log.oldStatus] : "—"}
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
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${ARCHIVE_STATUS_STYLE}`}
              >
                <StatusIcon status={log.newStatus} />
                {STATUS_LABELS[log.newStatus]}
              </span>
              <span className="text-text-secondary">{log.changedByName || "—"}</span>
              <span className="text-text-secondary">
                {new Date(log.changedAt).toLocaleDateString("ru-RU")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
