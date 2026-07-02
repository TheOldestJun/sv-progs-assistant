/*
 * Hook: useOrders
 * - useQuery для получения списка заявок (GET /api/orders)
 * - Возвращает Order[] (с вложенными позициями, продуктами, единицами, заявителем)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type OrderItemStatus =
  | "ACCEPTED"
  | "INVOICE_RECEIVED"
  | "INVOICE_PAID"
  | "SHIPPED"
  | "RECEIVED";

export const STATUS_LABELS: Record<OrderItemStatus, string> = {
  ACCEPTED: "Принято в работу",
  INVOICE_RECEIVED: "Счёт получен",
  INVOICE_PAID: "Счёт оплачен",
  SHIPPED: "Отправлено поставщиком",
  RECEIVED: "Получено на склад",
};

// Канонический порядок жизненного цикла статусов заявки.
// Все переходы должны соответствовать этому порядку (нельзя перескочить через шаг).
export const STATUS_ORDER: OrderItemStatus[] = [
  "ACCEPTED",
  "INVOICE_RECEIVED",
  "INVOICE_PAID",
  "SHIPPED",
  "RECEIVED",
];

export interface StatusLogEntry {
  id: string;
  oldStatus: OrderItemStatus | null;
  newStatus: OrderItemStatus;
  changedAt: string;
  changedBy: { name: string };
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  unitId: string;
  quantity: number;
  comment: string | null;
  status: OrderItemStatus;
  product: { title: string };
  units: { title: string };
  statusLogs?: StatusLogEntry[];
}

export interface Order {
  id: string;
  requesterId: string;
  created: string;
  requester: { name: string };
  items: OrderItem[];
}

async function fetchOrders(): Promise<Order[]> {
  const res = await fetch("/api/orders");
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export async function fetchItemLogs(
  orderId: string,
  itemId: string,
): Promise<StatusLogEntry[]> {
  const res = await fetch(`/api/orders/${orderId}/items/${itemId}`);
  if (!res.ok) throw new Error("Failed to fetch item logs");
  return res.json();
}

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });
}

export function useUpdateOrderItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      itemId,
      status,
      warehouseMode,
    }: {
      orderId: string;
      itemId: string;
      status: OrderItemStatus;
      // warehouseMode=true: склад отмечает RECEIVED, сервер проверяет роль WAREHOUSE
      // warehouseMode=false/undefined: другие отделы, RECEIVED запрещён
      warehouseMode?: boolean;
    }) => {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, warehouseMode }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
