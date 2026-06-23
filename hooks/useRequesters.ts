/*
 * Hook: useRequesters
 * - useQuery для загрузки списка заявителей (/api/requesters)
 * - useMutation для создания нового заявителя с optimistic update
 * - Откат при ошибке
 * Возвращает { requesters, creation, ...query }
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { AutocompleteItem } from "@/components/ui/Autocomplete";

async function fetchRequesters(): Promise<AutocompleteItem[]> {
  const res = await fetch("/api/requesters");
  if (!res.ok) throw new Error("Failed to fetch requesters");
  return res.json();
}

async function createRequester(name: string): Promise<AutocompleteItem> {
  const res = await fetch("/api/requesters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create requester");
  }
  return res.json();
}

export function useRequesters() {
  const queryClient = useQueryClient();

  const { data: requesters = [], ...query } = useQuery<AutocompleteItem[]>({
    queryKey: ["requesters"],
    queryFn: fetchRequesters,
  });

  const creation = useMutation<AutocompleteItem, Error, string, { previous: AutocompleteItem[] | undefined }>({
    mutationFn: createRequester,
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: ["requesters"] });
      const previous = queryClient.getQueryData<AutocompleteItem[]>(["requesters"]);

      const optimistic: AutocompleteItem = { id: `optimistic-${Date.now()}`, title: name };
      queryClient.setQueryData<AutocompleteItem[]>(["requesters"], (old) => [
        ...(old || []),
        optimistic,
      ]);

      return { previous, optimistic };
    },
    onError: (_err, _name, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["requesters"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["requesters"] });
    },
  });

  return { requesters, creation, ...query };
}
