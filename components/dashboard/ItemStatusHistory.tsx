/*
 * ItemStatusHistory — раскрываемая секция с комментарием к позиции
 * и историей изменений статусов.
 */
import type { OrderItemStatus } from "@prisma/client";
import type { StatusLogEntry } from "@/hooks/useOrders";
import { STATUS_LABELS } from "@/hooks/useOrders";
import { StatusIcon } from "@/components/dashboard/StatusIcon";

const STATUS_COLORS: Record<OrderItemStatus, string> = {
  ACCEPTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  INVOICE_RECEIVED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  INVOICE_PAID: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  SHIPPED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  RECEIVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  SENT_TO_REQUESTER: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  ORDER_CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

interface ItemStatusHistoryProps {
  comment: string | null;
  logs: StatusLogEntry[];
}

export function ItemStatusHistory({ comment, logs }: ItemStatusHistoryProps) {
  return (
    <div className="space-y-3">
      {comment && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 size-4 shrink-0 text-accent-blue"
          >
            <path
              fillRule="evenodd"
              d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 0 1-4.083-.98L2 17l1.338-2.566A6.973 6.973 0 0 1 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7ZM7 9H5v2h2V9Zm8 0h-2v2h2V9Zm-4 0H9v2h2V9Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-foreground">{comment}</span>
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-xs text-text-secondary">История изменений пуста</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${
                    log.oldStatus
                      ? STATUS_COLORS[log.oldStatus]
                      : "bg-surface text-text-secondary"
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
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ${STATUS_COLORS[log.newStatus]}`}
                >
                  <StatusIcon status={log.newStatus} />
                  {STATUS_LABELS[log.newStatus]}
                </span>
              </div>
              <span className="text-text-secondary">{log.changedBy.name}</span>
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
