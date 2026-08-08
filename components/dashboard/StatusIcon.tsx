/*
 * StatusIcon — общая иконка статуса позиции.
 * SVG-пути централизованы в app/lib/orderStatuses.ts (STATUS_ICON_PATHS),
 * чтобы не расходиться между таблицами заявок, историей и диалогами.
 */
import type { OrderItemStatus } from "@prisma/client";
import { STATUS_ICON_PATHS } from "@/app/lib/orderStatuses";

export function StatusIcon({ status, className }: { status: OrderItemStatus; className?: string }) {
  const paths = STATUS_ICON_PATHS[status];
  if (!paths) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className || "size-3.5 shrink-0"}
    >
      {paths.map((p, i) => (
        <path key={i} d={p.d} fillRule={p.fillRule} clipRule={p.clipRule} />
      ))}
    </svg>
  );
}
