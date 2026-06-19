"use client";

import { useState } from "react";
import { Autocomplete, type AutocompleteItem } from "@/components/ui/Autocomplete";
import { useProducts, type Product } from "@/hooks/useProducts";
import { useToast } from "@/components/ui/Toast";

export function HeadOfSupplyDashboard() {
  const { products, creation } = useProducts();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Product | null>(null);

  function handleSelect(item: AutocompleteItem) {
    setSelected(products.find((p) => p.id === item.id) || null);
  }

  function handleCreate(title: string): AutocompleteItem {
    creation.mutate(title, {
      onSuccess: (product) => {
        showToast(`Продукт «${product.title}» создан`, "success");
      },
      onError: (err) => {
        showToast(err.message || "Ошибка при создании продукта", "error");
      },
    });
    return { id: `optimistic-${Date.now()}`, title };
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xl">📋</span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Начальник снабжения
          </h2>
          <p className="text-sm text-text-secondary">
            Управление заявками на снабжение, контроль поставок.
          </p>
        </div>
      </div>

      <div className="mb-4">
        <Autocomplete
          label="Продукт"
          placeholder="Начните вводить название продукта..."
          items={creation.isPending
            ? [...products, { id: "pending", title: "Сохранение..." }]
            : products
          }
          value={selected}
          onSelect={handleSelect}
          onCreate={handleCreate}
        />
      </div>

      {selected && (
        <div className="rounded-lg border border-border bg-surface-secondary p-4">
          <p className="text-sm font-medium text-foreground">
            Выбранный продукт: <span className="text-primary">{selected.title}</span>
          </p>
        </div>
      )}
    </section>
  );
}
