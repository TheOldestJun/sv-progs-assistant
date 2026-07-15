/*
 * Централизованные константы для метаданных ролей и статусов.
 * Используются в дашбордах, админке и таблицах.
 */

export const ROLE_META: Record<string, { labelKey: string; icon: string }> = {
  ADMIN: { labelKey: "ADMIN", icon: "⚙" },
  HEAD_OF_SUPPLY: { labelKey: "HEAD_OF_SUPPLY", icon: "📋" },
  SUPPLY_DEPT: { labelKey: "SUPPLY_DEPT", icon: "📦" },
  WAREHOUSE: { labelKey: "WAREHOUSE", icon: "🏭" },
  REQUESTER: { labelKey: "REQUESTER", icon: "📝" },
};

export const ROLE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  ADMIN:          { bg: "bg-rose-50 dark:bg-rose-950",     text: "text-rose-700 dark:text-rose-300",     ring: "ring-rose-600/20" },
  HEAD_OF_SUPPLY: { bg: "bg-violet-50 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-300", ring: "ring-violet-600/20" },
  SUPPLY_DEPT:    { bg: "bg-blue-50 dark:bg-blue-950",    text: "text-blue-700 dark:text-blue-300",     ring: "ring-blue-600/20" },
  WAREHOUSE:      { bg: "bg-amber-50 dark:bg-amber-950",  text: "text-amber-700 dark:text-amber-300",   ring: "ring-amber-600/20" },
  REQUESTER:      { bg: "bg-teal-50 dark:bg-teal-950",   text: "text-teal-700 dark:text-teal-300",     ring: "ring-teal-600/20" },
};

export const ALL_ROLES = [
  { value: "ADMIN", labelKey: "ADMIN" },
  { value: "HEAD_OF_SUPPLY", labelKey: "HEAD_OF_SUPPLY" },
  { value: "SUPPLY_DEPT", labelKey: "SUPPLY_DEPT" },
  { value: "WAREHOUSE", labelKey: "WAREHOUSE" },
  { value: "REQUESTER", labelKey: "REQUESTER" },
];

export const STATUS_ORDER = [
  "ACCEPTED",
  "INVOICE_RECEIVED",
  "INVOICE_PAID",
  "SHIPPED",
  "RECEIVED",
] as const;

export type OrderStatus = (typeof STATUS_ORDER)[number];

export const STATUS_COLORS: Record<string, string> = {
  ACCEPTED:         "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  INVOICE_RECEIVED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  INVOICE_PAID:     "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  SHIPPED:          "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  RECEIVED:         "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};
