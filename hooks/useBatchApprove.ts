/*
 * Hook: useBatchApprove
 * - useMutation для POST /api/orders/batch-approve
 * - Одобряет все PENDING_DIRECTORATE позиции выбранного заявителя
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface BatchApproveInput {
  requesterId?: string;
  orderId?: string;
  changedAt?: string;
}

async function batchApprove(input: BatchApproveInput): Promise<{ count: number }> {
  const res = await fetch("/api/orders/batch-approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to approve");
  }
  return res.json();
}

export function useBatchApprove() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchApprove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
