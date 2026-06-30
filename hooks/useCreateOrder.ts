/*
 * Hook: useCreateOrder
 * - useMutation для отправки заявки на /api/orders (POST)
 * - Принимает OrderInput { requesterId, items[], notes }
 * - Без optimistic update (простая отправка)
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface OrderItemInput {
  productId: string;
  unitId: string;
  quantity: number;
  comment?: string;
}

interface OrderInput {
  requesterId: string;
  items: OrderItemInput[];
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
