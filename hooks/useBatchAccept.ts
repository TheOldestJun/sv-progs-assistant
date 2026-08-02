/*
 * Hook: useBatchAccept
 * - useMutation для POST /api/orders/batch-accept
 * - Принимает все DIRECTORATE_APPROVED позиции выбранного заявителя в работу (ACCEPTED)
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface BatchAcceptInput {
  requesterId?: string;
  orderId?: string;
  changedAt?: string;
}

async function batchAccept(input: BatchAcceptInput): Promise<{ count: number }> {
  const res = await fetch("/api/orders/batch-accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to accept");
  }
  return res.json();
}

export function useBatchAccept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchAccept,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
