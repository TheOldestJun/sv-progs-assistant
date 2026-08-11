/*
 * Hook: useDishes
 * - useDishes — список блюд (GET /api/dishes)
 * - useCreateDish — создание блюда (POST /api/dishes)
 * - useUpdateDish — обновление цены/названия (PATCH /api/dishes/:id)
 *
 * В отличие от useReferenceData (только id/title), блюда несут type и price,
 * поэтому реализованы отдельно.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DishType } from "@prisma/client";

export interface Dish {
  id: string;
  name: string;
  type: DishType;
  price: number;
  active: boolean;
}

interface DishesResponse {
  dishes: Dish[];
}

interface DishResponse {
  dish: Dish;
}

async function fetchDishes(): Promise<DishesResponse> {
  const res = await fetch("/api/dishes");
  if (!res.ok) throw new Error("Ошибка загрузки блюд");
  return res.json();
}

async function createDish(payload: {
  name: string;
  type?: DishType;
  price?: number;
}): Promise<DishResponse> {
  const res = await fetch("/api/dishes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка создания блюда");
  }
  return res.json();
}

async function updateDish(payload: {
  id: string;
  name?: string;
  price?: number;
}): Promise<DishResponse> {
  const res = await fetch(`/api/dishes/${payload.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: payload.name, price: payload.price }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Ошибка обновления блюда");
  }
  return res.json();
}

export function useDishes() {
  return useQuery<DishesResponse>({
    queryKey: ["dishes"],
    queryFn: fetchDishes,
  });
}

export function useCreateDish() {
  const queryClient = useQueryClient();
  return useMutation<DishResponse, Error, { name: string; type?: DishType; price?: number }>({
    mutationFn: createDish,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dishes"] });
    },
  });
}

export function useUpdateDish() {
  const queryClient = useQueryClient();
  return useMutation<DishResponse, Error, { id: string; name?: string; price?: number }>({
    mutationFn: updateDish,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dishes"] });
    },
  });
}
