/*
 * Hook: useProducts
 * - useQuery для загрузки списка продуктов (/api/products)
 * - useMutation для создания нового продукта с optimistic update
 * - Откат к предыдущему состоянию при ошибке
 * Возвращает { products, creation, ...query }
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

export interface Product {
  id: string;
  title: string;
}

async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

async function createProduct(title: string): Promise<Product> {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create product");
  }
  return res.json();
}

export function useProducts() {
  const queryClient = useQueryClient();

  const { data: products = [], ...query } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const creation = useMutation<Product, Error, string, { previous: Product[] | undefined }>({
    mutationFn: createProduct,
    onMutate: async (title) => {
      await queryClient.cancelQueries({ queryKey: ["products"] });
      const previous = queryClient.getQueryData<Product[]>(["products"]);

      const optimistic: Product = { id: `optimistic-${Date.now()}`, title: title.toUpperCase() };
      queryClient.setQueryData<Product[]>(["products"], (old) => [
        ...(old || []),
        optimistic,
      ]);

      return { previous, optimistic };
    },
    onError: (_err, _title, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["products"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return { products, creation, ...query };
}
