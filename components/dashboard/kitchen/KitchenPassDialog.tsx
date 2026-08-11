/*
 * KitchenPassDialog — модальный редактор пропуска кухни для одного дня.
 *
 * Тип пропуска (Ввоз/Вывоз) и дата зафиксированы ячейкой, из которой открылся
 * диалог. Блюда выбираются нашим Autocomplete (только название, без количества
 * и единиц — по ТЗ). Если сохранённых позиций ещё нет — предзаполняется
 * автоматически блюдами из меню этого дня (решение пользователя).
 *
 * Autocomplete синхронный: onCreate возвращает optimistic-id и открывает окно
 * создания блюда (как в MenuPlanner) через useCreateDish, после ответа сервера
 * optimistic-id заменяется на реальный.
 */
"use client";

import { useRef, useState } from "react";
import { Autocomplete, type AutocompleteItem } from "@/components/ui/Autocomplete";
import { useToast } from "@/components/ui/Toast";
import { useCreateDish, type Dish } from "@/hooks/useDishes";
import { useFocusTrap } from "@/components/ui/useFocusTrap";

const MAX_ITEMS = 31;

interface KitchenPassDialogProps {
  open: boolean;
  onClose: () => void;
  /** Заголовок: «Ввоз 11 августа», «Вывоз 12 августа» */
  title: string;
  /** Список всех блюд для автокомплита */
  dishes: Dish[];
  /** Текущие выбранные id блюд (или пусто, если ещё не сохраняли) */
  dishIds: string[];
  /** Сохранить выбранные блюда (только реальные id, без optimistic) */
  onSave: (dishIds: string[]) => void;
}

export function KitchenPassDialog({ open, onClose, title, dishes, dishIds, onSave }: KitchenPassDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, dialogRef, onClose);

  const { showToast } = useToast();
  const createDish = useCreateDish();

  const [items, setItems] = useState<AutocompleteItem[]>(() =>
    dishIds
      .map((id) => {
        const d = dishes.find((x) => x.id === id);
        return d ? { id: d.id, title: d.name } : null;
      })
      .filter((x): x is AutocompleteItem => x !== null),
  );

  const options: AutocompleteItem[] = dishes.map((d) => ({ id: d.id, title: d.name }));

  function addItem(item: AutocompleteItem) {
    setItems((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev;
      if (prev.length >= MAX_ITEMS) {
        showToast(`Максимум ${MAX_ITEMS} блюд`, "error");
        return prev;
      }
      return [...prev, item];
    });
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function handleCreate(title: string): AutocompleteItem {
    const optimisticId = `optimistic-${Date.now()}`;
    addItem({ id: optimisticId, title });
    createDish.mutate(
      { name: title },
      {
        onSuccess: (res) => {
          showToast(`Блюдо «${res.dish.name}» создано`, "success");
          setItems((prev) =>
            prev.map((it) => (it.id === optimisticId ? { id: res.dish.id, title: res.dish.name } : it)),
          );
        },
        onError: (err) => {
          showToast(err.message, "error");
          setItems((prev) => prev.filter((it) => it.id !== optimisticId));
        },
      },
    );
    return { id: optimisticId, title };
  }

  function handleSave() {
    // Сохраняем только реальные (не optimistic) id
    const realIds = items.filter((it) => !it.id.startsWith("optimistic-")).map((it) => it.id);
    onSave(realIds);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="kitchen-pass-dialog-title"
          className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-lg sm:p-6"
        >
          <h3 id="kitchen-pass-dialog-title" className="text-base font-semibold text-foreground">
            Пропуск: {title}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Выберите блюда для пропуска (количество и единицы не нужны)
          </p>

          <div className="mt-4 space-y-2">
            <div>
              <Autocomplete
                placeholder="Добавить блюдо..."
                items={options}
                value={null}
                onSelect={addItem}
                onCreate={handleCreate}
              />
            </div>

            {items.length > 0 ? (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{it.title}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      title={`Убрать «${it.title}»`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-surface-secondary p-4 text-center text-sm text-text-secondary">
                Пока нет блюд — добавьте первое через автокомплит
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={items.some((it) => it.id.startsWith("optimistic-"))}
            className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 max-sm:min-h-11"
          >
            Сохранить
          </button>
          <button
            onClick={onClose}
            className="mt-2 w-full rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-secondary max-sm:min-h-11"
          >
            Закрыть
          </button>
        </div>
      </div>
    </>
  );
}
