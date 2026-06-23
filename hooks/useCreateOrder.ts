/*
 * Hook: useCreateOrder
 * - useMutation для отправки заявки на /api/orders (POST)
 * - Принимает OrderInput { requesterId, items[], notes }
 * - Без optimistic update (простая отправка)
 */
import { useMutation } from "@tanstack/react-query";

interface OrderItemInput {
  productId: string;
  unitId: string;
  quantity: number;
}

interface OrderInput {
  requesterId: string;
  items: OrderItemInput[];
  notes: string | null;
}

async function createOrder(input: OrderInput) {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create order");
  }
  return res.json();
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: createOrder,
  });
}
