/*
 * Единый источник истины для статусов заявок и ролей доступа.
 * Используется сервером (API-роуты) и клиентом (hooks/useOrders.ts).
 *
 * ВАЖНО: только type-imports из @prisma/client — модуль попадает и в клиентский
 * бандл, рантайм-зависимости от prisma там недопустимы.
 *
 * Канонический порядок жизненного цикла: PENDING_DIRECTORATE → ... → ORDER_CONFIRMED.
 * Все переходы статусов проверяются на сервере (forward-only, см. PATCH items/[itemId]).
 */
import type { OrderItemStatus, Role } from "@prisma/client";

/** Канонический порядок жизненного цикла статусов (нельзя перескочить через шаг). */
export const ORDER_STATUS_SEQUENCE: OrderItemStatus[] = [
  "PENDING_DIRECTORATE",
  "DIRECTORATE_APPROVED",
  "ACCEPTED",
  "REQUEST_SENT",
  "INVOICE_RECEIVED",
  "INVOICE_PAID",
  "SHIPPED",
  "RECEIVED",
  "SENT_TO_REQUESTER",
  "ORDER_CONFIRMED",
];

/** Алиас для обратной совместимости с клиентским hooks/useOrders.ts (STATUS_ORDER). */
export const STATUS_ORDER = ORDER_STATUS_SEQUENCE;

/** Статусы, в которых заявка считается завершённой для ручного удаления/архивации. */
export const DELETE_FINAL_STATUSES: OrderItemStatus[] = [
  "RECEIVED",
  "SENT_TO_REQUESTER",
  "ORDER_CONFIRMED",
];

/** Единственный статус, при котором происходит АВТОархивация (когда ВСЕ позиции в нём). */
export const AUTO_ARCHIVE_STATUSES: OrderItemStatus[] = ["ORDER_CONFIRMED"];

/** Заявки в этом статусе может удалить сам заявитель (до одобрения директором). */
export const PENDING_STATUSES: OrderItemStatus[] = ["PENDING_DIRECTORATE"];

/** Статусы, которые может менять только склад (или админ). */
export const WAREHOUSE_ONLY_STATUSES: OrderItemStatus[] = [
  "RECEIVED",
  "SENT_TO_REQUESTER",
];

/** Промежуточные статусы, которые ведёт отдел снабжения (ACCEPTED..SHIPPED). */
export const SUPPLY_WORKFLOW_STATUSES: OrderItemStatus[] = [
  "ACCEPTED",
  "REQUEST_SENT",
  "INVOICE_RECEIVED",
  "INVOICE_PAID",
  "SHIPPED",
];

/** Роли, которым разрешено менять ТМЦ/кол-во/ед.изм. в позиции заявки. */
export const PRODUCT_EDIT_ROLES: Role[] = [
  "ADMIN",
  "HEAD_OF_SUPPLY",
  "SUPPLY_DEPT",
  "WAREHOUSE",
];

/** Роли, которые могут переводить позиции по снабженческому флоу (ACCEPTED..SHIPPED). */
export const SUPPLY_WORKFLOW_ROLES: Role[] = [
  "ADMIN",
  "HEAD_OF_SUPPLY",
  "SUPPLY_DEPT",
  "DIRECTORATE",
];

/** Роли, которым разрешено архивировать завершённые заявки (кроме заявителя своей pending-заявки). */
export const ARCHIVE_ROLES: Role[] = [
  "ADMIN",
  "HEAD_OF_SUPPLY",
  "SUPPLY_DEPT",
  "WAREHOUSE",
];

/** Роли, которым разрешено создавать справочные данные (Product/Unit/Requester).
 *  REQUESTER включён, т.к. заявитель добавляет новые ТМЦ через Enter-create в автокомплите.
 *  WAREHOUSE включён, т.к. склад создаёт ТМЦ при приёмке (ранее работало). */
export const REFERENCE_CREATE_ROLES: Role[] = [
  "ADMIN",
  "HEAD_OF_SUPPLY",
  "SUPPLY_DEPT",
  "WAREHOUSE",
  "REQUESTER",
];
