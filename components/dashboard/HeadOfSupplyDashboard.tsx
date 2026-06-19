"use client";

import { useState } from "react";
import { Autocomplete, type AutocompleteItem } from "@/components/ui/Autocomplete";

interface HeadOfSupplyDashboardProps {
  initialProducts: AutocompleteItem[];
}

let nextId = 999;

export function HeadOfSupplyDashboard({ initialProducts }: HeadOfSupplyDashboardProps) {
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<AutocompleteItem | null>(null);

  function handleCreate(title: string): AutocompleteItem {
    const item: AutocompleteItem = { id: String(++nextId), title };
    setProducts((prev) => [...prev, item]);
    return item;
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
          items={products}
          value={selected}
          onSelect={setSelected}
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
