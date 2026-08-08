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

/* ————————————————————————————————————————————————————————
 * Визуальное представление статусов (бейджи, кнопки, иконки).
 * Единый источник — раньше дублировался в 5+ местах и расходился.
 * Это чистые данные (строки классов/SVG-пути), рантайм-зависимостей нет.
 * ———————————————————————————————————————————————————————— */

/** Классы бейджа статуса (светлая/тёмная тема). Используется в таблицах заявок, истории, админке. */
export const STATUS_BADGE_COLORS: Record<OrderItemStatus, string> = {
  PENDING_DIRECTORATE: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  DIRECTORATE_APPROVED: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  ACCEPTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  REQUEST_SENT: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  INVOICE_RECEIVED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  INVOICE_PAID: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  SHIPPED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  RECEIVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  SENT_TO_REQUESTER: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  ORDER_CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

/** Классы кнопки подтверждения смены статуса (залитая, hover-оттенок). */
export const CONFIRM_BUTTON_COLORS: Record<OrderItemStatus, string> = {
  PENDING_DIRECTORATE: "bg-red-600 hover:bg-red-700",
  DIRECTORATE_APPROVED: "bg-teal-600 hover:bg-teal-700",
  ACCEPTED: "bg-blue-600 hover:bg-blue-700",
  REQUEST_SENT: "bg-sky-600 hover:bg-sky-700",
  INVOICE_RECEIVED: "bg-amber-600 hover:bg-amber-700",
  INVOICE_PAID: "bg-violet-600 hover:bg-violet-700",
  SHIPPED: "bg-cyan-600 hover:bg-cyan-700",
  RECEIVED: "bg-green-600 hover:bg-green-700",
  SENT_TO_REQUESTER: "bg-orange-600 hover:bg-orange-700",
  ORDER_CONFIRMED: "bg-emerald-600 hover:bg-emerald-700",
};

interface StatusIconPath {
  d: string;
  fillRule?: "evenodd";
  clipRule?: "evenodd";
}

/** SVG-пути иконок статусов (heroicons, viewBox 0 0 20 20). */
export const STATUS_ICON_PATHS: Record<OrderItemStatus, StatusIconPath[]> = {
  PENDING_DIRECTORATE: [
    { d: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z", fillRule: "evenodd", clipRule: "evenodd" },
  ],
  DIRECTORATE_APPROVED: [
    { d: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z", fillRule: "evenodd", clipRule: "evenodd" },
  ],
  ACCEPTED: [
    { d: "M6 2.75A.75.75 0 0 1 6.75 2h6.5a.75.75 0 0 1 0 1.5h-2.5v1.75c0 .69-.56 1.25-1.25 1.25h-1.5a.75.75 0 0 1 0-1.5h.5V3.5h-2A.75.75 0 0 1 6 2.75ZM6 7a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 6 7Zm0 3a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 6 10Zm6 2.25a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5h3.5Z", fillRule: "evenodd", clipRule: "evenodd" },
    { d: "M11.5 15.25a.75.75 0 0 0 0 1.5h.75a.75.75 0 0 0 0-1.5h-.75Z" },
    { d: "M3.5 3.5A1.5 1.5 0 0 0 2 5v10a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V5a1.5 1.5 0 0 0-1.5-1.5h-8Zm0 1.5h8a.25.25 0 0 1 .25.25v10a.25.25 0 0 1-.25.25h-8a.25.25 0 0 1-.25-.25V5a.25.25 0 0 1 .25-.25Z" },
  ],
  REQUEST_SENT: [
    { d: "M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" },
  ],
  INVOICE_RECEIVED: [
    { d: "M4.5 2A1.5 1.5 0 0 0 3 3.5v13.256c0 .72.514 1.338 1.215 1.482a7.516 7.516 0 0 0 3.57-.372 7.5 7.5 0 0 1 4.43 0 7.516 7.516 0 0 0 3.57.372c.701-.144 1.215-.762 1.215-1.482V3.5A1.5 1.5 0 0 0 15.5 2h-11Zm3.75 3.75a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1 0-1.5h2.5ZM7 8.5a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 7 8.5Zm-1.5 3.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" },
  ],
  INVOICE_PAID: [
    { d: "M2.5 4A1.5 1.5 0 0 0 1 5.5V6h18v-.5A1.5 1.5 0 0 0 17.5 4h-15ZM1 10.25V14a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 19 14v-3.75h-4.5a2.5 2.5 0 0 1-5 0H1Zm15.5 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z", fillRule: "evenodd", clipRule: "evenodd" },
    { d: "M11.5 10.25a1.5 1.5 0 0 1-3 0H1V7h18v3.25h-7.5Z" },
  ],
  SHIPPED: [
    { d: "M6.5 3c-1.051 0-2.093.04-3.125.117A1.49 1.49 0 0 0 2 4.607V10.5h4.75a.75.75 0 0 1 .75.75v3.25h1.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75V12H3.5v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463C4.286 3.07 5.436 3 6.5 3ZM17.5 4.607c0-.72-.514-1.34-1.223-1.463A24.7 24.7 0 0 0 12.5 3c-1.064 0-2.116.033-3.152.115C8.173 3.206 7.5 3.976 7.5 4.726V10.5h3.75a.75.75 0 0 1 .75.75v3.25h.625a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75V12H10v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463A24.7 24.7 0 0 1 12.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V12h-2.25v2.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H9V12H2.5v2.25a.75.75 0 0 1-1.5 0V4.607c0-.72.514-1.34 1.223-1.463C3.286 3.07 4.436 3 5.5 3" },
  ],
  RECEIVED: [
    { d: "M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 0 0-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 0 0 0-1.5H5.378A2.25 2.25 0 0 1 7.5 15h11.218a.75.75 0 0 0 .674-.421 60.358 60.358 0 0 0 2.96-7.228.75.75 0 0 0-.525-.965A60.864 60.864 0 0 0 5.68 4.509l-.232-.867A1.875 1.875 0 0 0 3.636 2.25H2.25ZM6.75 17.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM15.75 17.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" },
  ],
  SENT_TO_REQUESTER: [
    { d: "M3 3.25c0-1.036.84-1.875 1.875-1.875h9.75c1.036 0 1.875.84 1.875 1.875v9.75a1.875 1.875 0 0 1-1.875 1.875H12v2.25A2.75 2.75 0 0 1 9.25 18h-6A2.75 2.75 0 0 1 .5 15.25V5.75c0-1.519 1.231-2.75 2.75-2.75h11A2.75 2.75 0 0 1 17 5.75v2.25h-2.25V3.75a.375.375 0 0 0-.375-.375H3.375a.375.375 0 0 0-.375.375Z" },
    { d: "M13 7.5h-1.5v4.25a.75.75 0 0 1-1.5 0V7.5H8.25a.75.75 0 0 1 0-1.5H10V1.75a.75.75 0 0 1 1.5 0V6H13.25a.75.75 0 0 1 0 1.5Z" },
  ],
  ORDER_CONFIRMED: [
    { d: "M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z", fillRule: "evenodd", clipRule: "evenodd" },
  ],
};
