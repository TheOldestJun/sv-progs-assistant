/*
 * ReferenceEditor — управление справочниками ТМЦ, единиц измерения и блюд
 * Autocomplete для выбора/создания, затем редактирование/удаление
 * ADR: optimistic ID при создании (id="optimistic-..."), заменяется на реальный после ответа сервера
 */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Autocomplete, type AutocompleteItem } from "@/components/ui/Autocomplete";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import type { Dish } from "@/hooks/useDishes";
import type { DishType } from "@prisma/client";

/** Русские подписи типов блюд (совпадают с категориями планировщика меню) */
const DISH_TYPE_LABELS: Record<DishType, string> = {
  SOUP: "Первое блюдо",
  GARNISH: "Гарнир",
  MEAT: "Мясное блюдо",
  SALAD: "Салат",
  BAKERY: "Выпечка",
  DRINK: "Напиток",
};

/** Порядок типов блюд в выпадающем списке (как строки планировщика меню) */
const DISH_TYPE_ORDER: DishType[] = [
  "SOUP",
  "GARNISH",
  "MEAT",
  "SALAD",
  "BAKERY",
  "DRINK",
];

/*
 * SelectedCard — карточка выбранной записи.
 * Два режима:
 * - display: название + кнопки ✏️ (переименовать) и 🗑️ (удалить с подтверждением)
 * - editing: инлайн-инпут, Enter → сохранить, Escape → отмена, Ок/Отмена кнопки
 */
function SelectedCard({
  item,
  onRename,
  onDelete,
}: {
  item: AutocompleteItem;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {

  /* Состояние редактирования: разворачивает инлайн-инпут вместо отображения */
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.title);
  const [pending, setPending] = useState(false);
  const { confirm } = useConfirmDialog();

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Удаление",
      message: `Удалить «${item.title}»? Действие необратимо.`,
      confirmText: "Удалить",
      variant: "danger",
    });
    if (!ok) return;
    setPending(true);
    await onDelete(item.id);
    setPending(false);
  };

  const saveRename = async () => {
    if (!editValue.trim() || editValue.trim() === item.title) {
      setEditing(false);
      return;
    }
    setPending(true);
    await onRename(item.id, editValue.trim());
    setPending(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border p-3">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveRename();
            if (e.key === "Escape") setEditing(false);
          }}
          autoFocus
          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          onClick={saveRename}
          disabled={pending}
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "…" : "Ок"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
        >
          Отмена
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-3">
      <span className="flex-1 text-sm text-foreground">{item.title}</span>
      <button
        onClick={() => { setEditValue(item.title); setEditing(true); }}
        disabled={pending}
        className="inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
        title="Переименовать"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
        </svg>
      </button>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        title="Удалить"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c-.84 0-1.673.025-2.5.075V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25v.325C11.673 4.025 10.84 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}

/*
 * DishCard — карточка выбранного блюда (имя + тип + цена).
 * В отличие от SelectedCard у блюда есть категория (тип) и цена, поэтому карточка
 * даёт редактировать все три поля:
 * - имя — инлайн-переименование (✏️ → инпут, Enter/Ок сохранить, Escape отмена)
 * - тип — выпадающий список категорий (SOUP…DRINK)
 * - цена — числовой инпут (десятичный разделитель «,» поддерживается)
 * - удаление — только ADMIN, через подтверждение
 */
function DishCard({
  dish,
  onUpdate,
  onDelete,
}: {
  dish: Dish;
  onUpdate: (patch: { name?: string; type?: DishType; price?: number }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(dish.name);
  const [typeValue, setTypeValue] = useState<DishType>(dish.type);
  const [priceValue, setPriceValue] = useState(String(dish.price));
  const [pending, setPending] = useState(false);
  const { confirm } = useConfirmDialog();

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Удаление блюда",
      message: `Удалить «${dish.name}»? Действие необратимо.`,
      confirmText: "Удалить",
      variant: "danger",
    });
    if (!ok) return;
    setPending(true);
    await onDelete(dish.id);
    setPending(false);
  };

  const saveFields = async () => {
    const patch: { name?: string; type?: DishType; price?: number } = {};
    const trimmedName = nameValue.trim();
    if (trimmedName && trimmedName !== dish.name) patch.name = trimmedName;
    if (typeValue !== dish.type) patch.type = typeValue;
    const priceNum = priceValue.trim() === "" ? NaN : parseFloat(priceValue.replace(",", "."));
    if (!Number.isNaN(priceNum) && priceNum >= 0 && priceNum !== dish.price) patch.price = priceNum;
    if (Object.keys(patch).length === 0) {
      setEditingName(false);
      return;
    }
    setPending(true);
    await onUpdate(patch);
    setPending(false);
    setEditingName(false);
  };

  return (
    <div className="rounded-lg border border-border p-3">
      {editingName ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveFields();
              if (e.key === "Escape") setEditingName(false);
            }}
            autoFocus
            className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            onClick={saveFields}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? "…" : "Ок"}
          </button>
          <button
            onClick={() => setEditingName(false)}
            className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface"
          >
            Отмена
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-sm font-medium text-foreground">{dish.name}</span>
          <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs text-text-secondary">
            {DISH_TYPE_LABELS[dish.type]}
          </span>
          <button
            onClick={() => { setNameValue(dish.name); setEditingName(true); }}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
            title="Переименовать"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
            title="Удалить"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c-.84 0-1.673.025-2.5.075V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25v.325C11.673 4.025 10.84 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase text-text-secondary">Тип</span>
          <select
            value={typeValue}
            onChange={(e) => setTypeValue(e.target.value as DishType)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
          >
            {DISH_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>{DISH_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase text-text-secondary">Цена, ₴</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveFields(); }}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
      </div>
      <button
        onClick={saveFields}
        disabled={pending}
        className="mt-2 inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "…" : "Сохранить изменения"}
      </button>
    </div>
  );
}

export function ReferenceEditor() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();

  const [selectedProduct, setSelectedProduct] = useState<AutocompleteItem | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<AutocompleteItem | null>(null);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [selectedPassProduct, setSelectedPassProduct] = useState<AutocompleteItem | null>(null);

  // Products
  const { data: products = [] } = useQuery<AutocompleteItem[]>({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const addProduct = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setSelectedProduct({ id: data.id, title: data.title });
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const renameProduct = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setSelectedProduct({ id: data.id, title: data.title });
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setSelectedProduct(null);
    },
    onError: (err) => showToast(err.message, "error"),
  });

  // Units
  const { data: units = [] } = useQuery<AutocompleteItem[]>({
    queryKey: ["admin-units"],
    queryFn: async () => {
      const res = await fetch("/api/units");
      if (!res.ok) throw new Error("Failed to fetch units");
      return res.json();
    },
  });

  const addUnit = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-units"] });
      setSelectedUnit({ id: data.id, title: data.title });
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const renameUnit = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/units/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-units"] });
      setSelectedUnit({ id: data.id, title: data.title });
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const deleteUnit = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/units/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-units"] });
      setSelectedUnit(null);
    },
    onError: (err) => showToast(err.message, "error"),
  });

  // Dishes (блюда кухни)
  const { data: dishes = [] } = useQuery<Dish[]>({
    queryKey: ["admin-dishes"],
    queryFn: async () => {
      const res = await fetch("/api/dishes");
      if (!res.ok) throw new Error("Failed to fetch dishes");
      const data = await res.json();
      return data.dishes as Dish[];
    },
  });

  const dishItems: AutocompleteItem[] = dishes.map((d) => ({ id: d.id, title: d.name }));

  const addDish = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/dishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      return res.json() as Promise<{ dish: Dish }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-dishes"] });
      setSelectedDish(data.dish);
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const updateDish = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { name?: string; type?: DishType; price?: number } }) => {
      const res = await fetch(`/api/dishes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      return res.json() as Promise<{ dish: Dish }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-dishes"] });
      setSelectedDish(data.dish);
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const deleteDish = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dishes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dishes"] });
      setSelectedDish(null);
    },
    onError: (err) => showToast(err.message, "error"),
  });

  // PassProducts (ТМЦ для пропусков — отдельный от Product справочник)
  const { data: passProducts = [] } = useQuery<AutocompleteItem[]>({
    queryKey: ["admin-passProducts"],
    queryFn: async () => {
      const res = await fetch("/api/pass-products");
      if (!res.ok) throw new Error("Failed to fetch pass-products");
      return res.json();
    },
  });

  const addPassProduct = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/pass-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-passProducts"] });
      setSelectedPassProduct({ id: data.id, title: data.title });
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const renamePassProduct = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/pass-products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-passProducts"] });
      setSelectedPassProduct({ id: data.id, title: data.title });
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const deletePassProduct = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pass-products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-passProducts"] });
      setSelectedPassProduct(null);
    },
    onError: (err) => showToast(err.message, "error"),
  });

  return (
    <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">ТМЦ</h2>
        <Autocomplete
          items={products}
          value={selectedProduct}
          onSelect={(item) => setSelectedProduct(item)}
          onCreate={(title) => {
            addProduct.mutate(title);
            return { id: "optimistic", title };
          }}
          placeholder="Поиск или создание ТМЦ…"
        />
        {selectedProduct && (
          <div className="mt-4">
            <SelectedCard
              item={selectedProduct}
              onRename={async (id, title) => renameProduct.mutateAsync({ id, title })}
              onDelete={async (id) => deleteProduct.mutateAsync(id)}
            />
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">Единицы измерения</h2>
        <Autocomplete
          items={units}
          value={selectedUnit}
          onSelect={(item) => setSelectedUnit(item)}
          onCreate={(title) => {
            addUnit.mutate(title);
            return { id: "optimistic", title };
          }}
          placeholder="Поиск или создание единицы…"
        />
        {selectedUnit && (
          <div className="mt-4">
            <SelectedCard
              item={selectedUnit}
              onRename={async (id, title) => renameUnit.mutateAsync({ id, title })}
              onDelete={async (id) => deleteUnit.mutateAsync(id)}
            />
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">Блюда</h2>
        <Autocomplete
          items={dishItems}
          value={selectedDish ? { id: selectedDish.id, title: selectedDish.name } : null}
          onSelect={(item) => {
            const dish = dishes.find((d) => d.id === item.id);
            if (dish) setSelectedDish(dish);
          }}
          onCreate={(title) => {
            addDish.mutate(title);
            return { id: "optimistic", title };
          }}
          placeholder="Поиск или создание блюда…"
        />
        {selectedDish && (
          <div className="mt-4">
            <DishCard
              dish={selectedDish}
              onUpdate={async (patch) => { await updateDish.mutateAsync({ id: selectedDish.id, patch }); }}
              onDelete={async (id) => deleteDish.mutateAsync(id)}
            />
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-foreground">ТМЦ пропусков</h2>
        <Autocomplete
          items={passProducts}
          value={selectedPassProduct}
          onSelect={(item) => setSelectedPassProduct(item)}
          onCreate={(title) => {
            addPassProduct.mutate(title);
            return { id: "optimistic", title };
          }}
          placeholder="Поиск или создание ТМЦ…"
        />
        {selectedPassProduct && (
          <div className="mt-4">
            <SelectedCard
              item={selectedPassProduct}
              onRename={async (id, title) => renamePassProduct.mutateAsync({ id, title })}
              onDelete={async (id) => deletePassProduct.mutateAsync(id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
