/*
 * EditProductDialog — модальное окно редактирования ТМЦ в позиции заявки.
 * Позволяет:
 * 1. Переименовать сам ТМЦ (меняет Product.title)
 * 2. Заменить на другой существующий ТМЦ (меняет productId у OrderItem)
 */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Autocomplete, type AutocompleteItem } from "@/components/ui/Autocomplete";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useUpdateOrderItemProduct, useRenameProduct } from "@/hooks/useUpdateOrderItemProduct";
import { useToast } from "@/components/ui/Toast";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

interface EditProductDialogProps {
  open: boolean;
  /** Текущий productId */
  productId: string;
  /** Текущее название ТМЦ */
  productTitle: string;
  /** ID заказа */
  orderId: string;
  /** ID позиции в заявке */
  itemId: string;
  onClose: () => void;
}

export function EditProductDialog({
  open,
  productId,
  productTitle,
  orderId,
  itemId,
  onClose,
}: EditProductDialogProps) {
  const [name, setName] = useState(productTitle);
  const [selected, setSelected] = useState<AutocompleteItem | null>(null);
  const [mode, setMode] = useState<"idle" | "renaming" | "replacing" | "creating">("idle");
  const [createQuery, setCreateQuery] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  const { data: products, creation: productCreation } = useReferenceData("products", "/api/products");
  const replaceProduct = useUpdateOrderItemProduct();
  const renameProduct = useRenameProduct();
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();

  // Сбрасываем состояние при открытии
  useEffect(() => {
    if (open) {
      setName(productTitle);
      setSelected(null);
      setMode("idle");
      setCreateQuery("");
    }
  }, [open, productTitle]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Скрытые товары — исключаем текущий и optimistic-элементы
  const filteredProducts = useMemo(
    () => products.filter((p) => !p.id.startsWith("optimistic-")),
    [products],
  );

  function handleRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed.toUpperCase() === productTitle) {
      onClose();
      return;
    }
    setMode("renaming");
    renameProduct.mutate(
      { productId, title: trimmed },
      {
        onSuccess: () => {
          showToast(`ТМЦ переименован в «${trimmed.toUpperCase()}»`, "success");
          onClose();
        },
        onError: (err) => {
          showToast(err.message, "error");
          setMode("idle");
        },
      },
    );
  }

  async function handleCreateAndReplace() {
    const trimmed = createQuery.trim();
    if (!trimmed) return;
    const ok = await confirm({
      title: "Создать и заменить?",
      message: `Будет создан ТМЦ «${trimmed}» и заменён в этой позиции вместо «${productTitle}».`,
      confirmText: "Создать и заменить",
      variant: "default",
    });
    if (!ok) return;
    setMode("creating");
    try {
      const created = await productCreation.mutateAsync(trimmed);
      setSelected(created);
      setMode("replacing");
      replaceProduct.mutate(
        { orderId, itemId, productId: created.id },
        {
          onSuccess: () => {
            showToast(`ТМЦ заменён на «${created.title}»`, "success");
            onClose();
          },
          onError: (err) => {
            showToast(err.message, "error");
            setMode("idle");
          },
        },
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ошибка создания ТМЦ", "error");
      setMode("idle");
    }
  }

  // Проверяем, есть ли введённый текст в списке продуктов
  const queryMatch = useMemo(() => {
    const q = createQuery.trim().toLowerCase();
    if (!q) return null;
    return filteredProducts.find((p) => p.title.toLowerCase() === q) ?? null;
  }, [createQuery, filteredProducts]);

  if (!open) return null;

  const isRenaming = mode === "renaming";
  const isReplacing = mode === "replacing";
  const isCreating = mode === "creating";
  const nameChanged = name.trim().toUpperCase() !== productTitle;
  const canRename = nameChanged && mode === "idle";
  const canCreate = createQuery.trim().length > 0 && !queryMatch && mode === "idle";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-product-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-md animate-fade-in rounded-2xl bg-white shadow-2xl dark:bg-gray-800 dark:text-gray-100"
      >
        <div className="p-6">
          <h2
            id="edit-product-title"
            className="text-base font-semibold text-foreground"
          >
            Редактировать ТМЦ
          </h2>

          {/* Переименование */}
          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Название
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary max-sm:min-h-11"
              />
              <button
                onClick={handleRename}
                disabled={!canRename}
                className="inline-flex shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 max-sm:min-h-11"
              >
                {isRenaming ? "..." : "Переименовать"}
              </button>
            </div>
          </div>

          {/* Разделитель */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-text-secondary">или</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* Замена на другой ТМЦ */}
          <div className="space-y-3">
            <Autocomplete
              items={filteredProducts}
              value={selected}
              onSelect={async (item) => {
                if (!item.id) return;
                const ok = await confirm({
                  title: "Заменить ТМЦ?",
                  message: `«${productTitle}» будет заменён на «${item.title}» в этой позиции.`,
                  confirmText: "Заменить",
                  variant: "default",
                });
                if (!ok) return;
                setSelected(item);
                setMode("replacing");
                replaceProduct.mutate(
                  { orderId, itemId, productId: item.id },
                  {
                    onSuccess: () => {
                      showToast(`ТМЦ заменён на «${item.title}»`, "success");
                      onClose();
                    },
                    onError: (err) => {
                      showToast(err.message, "error");
                      setMode("idle");
                    },
                  },
                );
              }}
              label="Заменить другим ТМЦ"
              placeholder="Поиск ТМЦ..."
              onCreate={(title) => {
                setCreateQuery(title);
                return { id: "", title };
              }}
            />
            {canCreate && (
              <button
                onClick={handleCreateAndReplace}
                disabled={isCreating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-accent py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/5 disabled:opacity-50 max-sm:min-h-11"
              >
                {isCreating ? (
                  "Создание..."
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    Создать «{createQuery.trim()}» и заменить
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end rounded-b-2xl border-t border-border bg-surface-secondary px-6 py-4">
          <button
            onClick={onClose}
            disabled={mode !== "idle"}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary disabled:opacity-50 max-sm:min-h-11"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
