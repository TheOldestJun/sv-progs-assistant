/*
 * Hook: useUnits
 * - useQuery для загрузки списка единиц измерения (/api/units)
 * - useMutation для создания новой единицы с optimistic update
 * - Откат к предыдущему состоянию при ошибке
 * Возвращает { units, creation, ...query }
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

export interface Unit {
  id: string;
  title: string;
}

async function fetchUnits(): Promise<Unit[]> {
  const res = await fetch("/api/units");
  if (!res.ok) throw new Error("Failed to fetch units");
  return res.json();
}

async function createUnit(title: string): Promise<Unit> {
  const res = await fetch("/api/units", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create unit");
  }
  return res.json();
}

export function useUnits() {
  const queryClient = useQueryClient();

  const { data: units = [], ...query } = useQuery<Unit[]>({
    queryKey: ["units"],
    queryFn: fetchUnits,
  });

  const creation = useMutation<Unit, Error, string, { previous: Unit[] | undefined }>({
    mutationFn: createUnit,
    onMutate: async (title) => {
      await queryClient.cancelQueries({ queryKey: ["units"] });
      const previous = queryClient.getQueryData<Unit[]>(["units"]);

      const optimistic: Unit = { id: `optimistic-${Date.now()}`, title: title.toUpperCase() };
      queryClient.setQueryData<Unit[]>(["units"], (old) => [
        ...(old || []),
        optimistic,
      ]);

      return { previous, optimistic };
    },
    onError: (_err, _title, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["units"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });

  return { units, creation, ...query };
}
