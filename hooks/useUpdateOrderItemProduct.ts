/*
 * Hook: useUpdateOrderItemProduct / useRenameProduct
 * - useUpdateOrderItemProduct: замена ТМЦ в позиции заявки (меняет productId)
 * - useRenameProduct: переименование самого ТМЦ (меняет title в Product)
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateOrderItemProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      itemId,
      productId,
    }: {
      orderId: string;
      itemId: string;
      productId: string;
    }) => {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useRenameProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      title,
    }: {
      productId: string;
      title: string;
    }) => {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to rename product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
