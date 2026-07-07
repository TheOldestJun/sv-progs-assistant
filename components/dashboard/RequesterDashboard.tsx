/*
 * RequesterDashboard — дашборд заявителя (роль REQUESTER).
 * Две вкладки:
 * - «Новая заявка» — упрощённая форма (без выбора заявителя, привязывается автоматически)
 * - «Мои заявки» — таблица собственных заявок (только просмотр)
 * API автоматически определяет заявителя по сессии (userId → Requester).
 */
"use client";

import { useState } from "react";
import { Autocomplete, type AutocompleteItem } from "@/components/ui/Autocomplete";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useToast } from "@/components/ui/Toast";
import { OrderStatusTable } from "./OrderStatusTable";
import { DatePicker } from "@/components/ui/DatePicker";
import { DashboardTabs } from "./DashboardTabs";

interface OrderItem {
  id: string;
  product: AutocompleteItem | null;
  unit: AutocompleteItem | null;
  quantity: string;
  comment: string;
}

let itemIdCounter = 0;
function createEmptyItem(): OrderItem {
  return { id: String(++itemIdCounter), product: null, unit: null, quantity: "", comment: "" };
}

function isItemComplete(item: OrderItem): boolean {
  return item.product !== null && item.unit !== null && item.quantity.trim() !== "";
}

export function RequesterDashboard() {
  const { data: products, creation: productCreation } = useReferenceData("products", "/api/products");
  const { data: units, creation: unitCreation } = useReferenceData("units", "/api/units");
  const { showToast } = useToast();
  const createOrder = useCreateOrder();

  const [items, setItems] = useState<OrderItem[]>([createEmptyItem()]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function updateItem(id: string, patch: Partial<OrderItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function addItem() {
    setItems((prev) => [...prev, createEmptyItem()]);
  }

  /*
   * Оптимистичные ID: когда пользователь создаёт новый продукт/единицу,
   * Autocomplete возвращает { id: "optimistic-<timestamp>", title } до ответа сервера.
   * После успешного сохранения onSuccess заменяет optimistic ID на реальный из БД.
   */
  function handleProductCreate(title: string): AutocompleteItem {
    const optimisticId = `optimistic-${Date.now()}`;
    productCreation.mutate(title, {
      onSuccess: (p) => {
        showToast(`Продукт «${p.title}» создан`, "success");
        setItems((prev) =>
          prev.map((it) =>
            it.product?.id === optimisticId
              ? { ...it, product: { id: p.id, title: p.title } }
              : it,
          ),
        );
      },
      onError: (err) => showToast(err.message, "error"),
    });
    return { id: optimisticId, title };
  }

  function handleUnitCreate(title: string): AutocompleteItem {
    const optimisticId = `optimistic-${Date.now()}`;
    unitCreation.mutate(title, {
      onSuccess: (u) => {
        showToast(`Единица «${u.title}» создана`, "success");
        setItems((prev) =>
          prev.map((it) =>
            it.unit?.id === optimisticId
              ? { ...it, unit: { id: u.id, title: u.title } }
              : it,
          ),
        );
      },
      onError: (err) => showToast(err.message, "error"),
    });
    return { id: optimisticId, title };
  }

  function isOptimistic(id: string) {
    return id.startsWith("optimistic-");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validItems = items.filter(isItemComplete);
    if (validItems.length === 0) {
      showToast("Добавьте хотя бы одну заполненную позицию", "error");
      return;
    }

    for (const item of validItems) {
      if (isOptimistic(item.product!.id) || isOptimistic(item.unit!.id)) {
        showToast("Подождите сохранения новых продуктов/единиц", "error");
        return;
      }
    }

    // requesterId не передаём — API сам найдёт/создаст Requester по userId из сессии
    const payload = {
      items: validItems.map((it) => ({
        productId: it.product!.id,
        unitId: it.unit!.id,
        quantity: parseFloat(it.quantity),
        comment: it.comment.trim() || undefined,
      })),
    };

    createOrder.mutate(payload, {
      onSuccess: () => {
        showToast("Заявка успешно создана", "success");
        setItems([createEmptyItem()]);
      },
      onError: (err) => {
        showToast(err.message || "Ошибка при создании заявки", "error");
      },
    });
  }

  const lastItem = items[items.length - 1];
  const canAdd = isItemComplete(lastItem);

  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <span className="text-2xl">📝</span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Панель заказчика
          </h2>
          <p className="text-sm text-text-secondary">
            Создание и отслеживание заявок на снабжение
          </p>
        </div>
      </div>

      <DashboardTabs
        tabs={[
          { role: "create", label: "Новая заявка", icon: "✏️" },
          { role: "orders", label: "Мои заявки", icon: "📋" },
        ]}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <DatePicker label="Дата" value={date} onChange={setDate} />

          <hr className="border-border" />

          <div className="space-y-4">
            <div className="hidden items-center gap-3 px-1 text-xs font-medium uppercase tracking-wider text-text-secondary sm:grid sm:grid-cols-[1fr_1fr_120px_32px]">
              <span>Продукт</span>
              <span>Единица</span>
              <span>Количество</span>
              <span />
            </div>

          {items.map((item, idx) => (
            <div key={item.id} className="space-y-2">
              <div className="items-end gap-3 sm:grid sm:grid-cols-[1fr_1fr_120px_32px]">
                <Autocomplete
                  placeholder="Начните вводить..."
                  items={
                    productCreation.isPending
                      ? [...products, { id: "pending", title: "Сохранение..." }]
                      : products
                  }
                  value={item.product}
                  onSelect={(p) => updateItem(item.id, { product: p })}
                  onCreate={handleProductCreate}
                />

                <Autocomplete
                  placeholder="Начните вводить..."
                  items={
                    unitCreation.isPending
                      ? [...units, { id: "pending", title: "Сохранение..." }]
                      : units
                  }
                  value={item.unit}
                  onSelect={(u) => updateItem(item.id, { unit: u })}
                  onCreate={handleUnitCreate}
                />

                <div className="flex items-center gap-2 sm:contents">
                  <input
                    type="number"
                    aria-label="Количество"
                    step="0.1"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    placeholder="0"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary"
                  />

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="flex h-9 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors enabled:hover:bg-red-50 enabled:hover:text-red-500 disabled:opacity-0 dark:enabled:hover:bg-red-950 dark:enabled:hover:text-red-400 max-sm:h-11 max-sm:w-11"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 max-sm:size-5">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={item.comment}
                onChange={(e) => updateItem(item.id, { comment: e.target.value })}
                placeholder="Комментарий к позиции (необязательно)"
                className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}

            {canAdd && (
              <button
                type="button"
                onClick={addItem}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-border px-4 text-sm text-text-secondary transition-colors hover:border-primary hover:text-primary max-sm:min-h-11"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
                Добавить позицию
              </button>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createOrder.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 max-sm:min-h-11"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path d="M3.5 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0v-4.392l1.657-.348a6.449 6.449 0 0 1 1.271-.105 7.363 7.363 0 0 1 3.186.798 6.415 6.415 0 0 0 2.628.628 7.823 7.823 0 0 0 2.905-.616l-8.147 1.71V2.75Z" />
                <path d="M15.084 12.692a5.443 5.443 0 0 1 .66.048c.477.064 1.034.174 1.256.367.31.27.5.659.5 1.143 0 .598-.31 1.024-.863 1.352-.55.326-1.345.568-2.304.568-1.433 0-2.614-.44-3.46-1.03l.66-1.352c.774.508 1.694.882 2.8.882.518 0 .9-.12 1.112-.295.2-.164.255-.363.255-.525 0-.305-.24-.493-.58-.611-.231-.08-.52-.134-.855-.183-.688-.1-1.55-.224-2.382-.472-1.252-.372-2.296-1.226-2.296-2.873 0-1.27.756-2.353 2.062-2.951.618-.282 1.34-.432 2.111-.432 1.08 0 2.118.207 3.132.816l-.719 1.367c-.727-.48-1.543-.683-2.413-.683-.51 0-.913.114-1.18.31-.284.21-.395.49-.395.76 0 .382.243.578.593.704.297.107.659.17 1.028.226.665.1 1.424.214 2.156.478 1.2.434 2.064 1.335 2.064 2.823 0 .77-.278 1.604-1.038 2.197-.49.383-1.16.641-2.035.641-.893 0-2.028-.238-3.071-.87Z" />
              </svg>
              Отправить заявку
            </button>
          </div>
        </form>

        <div>
          <OrderStatusTable readOnly />
        </div>
      </DashboardTabs>
    </section>
  );
}
