/*
 * Generic hook: useReferenceData
 * Заменяет useProducts, useUnits, useRequesters (все 3 были идентичными)
 * Принимает queryKey + endpoint и возвращает { data, creation, ...query }
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

interface RefItem {
  id: string;
  title: string;
}

async function fetchList(endpoint: string): Promise<RefItem[]> {
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return res.json();
}

type PayloadFn = (value: string) => Record<string, unknown>;

function defaultPayload(value: string): Record<string, unknown> {
  return { title: value };
}

async function createItem(
  endpoint: string,
  value: string,
  toPayload: PayloadFn,
): Promise<RefItem> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toPayload(value)),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Failed to create item`);
  }
  return res.json();
}

export function useReferenceData(
  queryKey: string,
  endpoint: string,
  toPayload?: PayloadFn,
) {
  const queryClient = useQueryClient();

  const query = useQuery<RefItem[]>({
    queryKey: [queryKey],
    queryFn: () => fetchList(endpoint),
  });

  const creation = useMutation<
    RefItem,
    Error,
    string,
    { previous: RefItem[] | undefined }
  >({
    mutationFn: (value: string) => createItem(endpoint, value, toPayload ?? defaultPayload),
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: [queryKey] });
      const previous = queryClient.getQueryData<RefItem[]>([queryKey]);

      const optimistic: RefItem = {
        id: `optimistic-${Date.now()}`,
        title: value,
      };
      queryClient.setQueryData<RefItem[]>([queryKey], (old) => [
        ...(old || []),
        optimistic,
      ]);

      return { previous };
    },
    onError: (_err, _value, context) => {
      if (context?.previous) {
        queryClient.setQueryData([queryKey], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });

  return { ...query, data: query.data ?? [], creation };
}
