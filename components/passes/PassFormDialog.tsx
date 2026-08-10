/*
 * PassFormDialog — модальная версия PassForm для создания пропуска на ввоз.
 * Открывается из таблицы выполнения заявок (OrderStatusTable) с предзаполнением
 * выбранных позиций (prefillItems). Генерирует Excel через exceljs + шаблон IN_OUT.xlsx.
 * Логика генерации скопирована из PassForm.tsx; здесь добавляется фокус-ловушка (L2)
 * и предзаполнение выбранными позициями при открытии.
 */
"use client";

import { useRef, useState } from "react";
import ExcelJS from "exceljs";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useToast } from "@/components/ui/Toast";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { DatePicker } from "@/components/ui/DatePicker";
import { useFocusTrap } from "@/components/ui/useFocusTrap";
import { numToWordsUpper } from "@/lib/numToWords";

type PassType = "import" | "export" | "import_with_export";

const PASS_TYPES: { id: PassType; label: string }[] = [
  { id: "import", label: "Ввоз" },
  { id: "export", label: "Вывоз" },
  { id: "import_with_export", label: "Ввоз/Вывоз" },
];

const SHEET_MAP: Record<PassType, string> = {
  import: "IN",
  export: "OUT",
  import_with_export: "IN_OUT",
};

const MAX_ITEMS = 31;
const TEMPLATE_URL = "/xls/IN_OUT.xlsx";

export interface PassItem {
  id: string;
  product: { id: string; title: string } | null;
  unit: { id: string; title: string } | null;
  quantity: string;
}

let _idCounter = 0;
function emptyItem(): PassItem {
  return { id: `pi_${++_idCounter}_${Date.now()}`, product: null, unit: null, quantity: "" };
}

function isFilled(item: PassItem): boolean {
  return item.product !== null && item.unit !== null && item.quantity.trim() !== "";
}

interface PassFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Позиции, которые нужно предзаполнить в пропуске (выбранные в таблице заявок) */
  prefillItems?: PassItem[];
}

export function PassFormDialog({ open, onClose, prefillItems }: PassFormDialogProps) {
  const { data: products, creation: productCreation } = useReferenceData("products", "/api/products");
  const { data: units, creation: unitCreation } = useReferenceData("units", "/api/units");
  const { showToast } = useToast();

  const dialogRef = useRef<HTMLDivElement>(null);
  // Компонент монтируется только когда диалог открыт, поэтому open=true всегда.
  // Focus-trap: фокус не уходит, Escape закрывает, фокус возвращается (UI-аудит L2).
  useFocusTrap(open, dialogRef, onClose);

  const [selectedType, setSelectedType] = useState<PassType>(() =>
    prefillItems && prefillItems.length > 0 ? "import" : "import",
  );
  const [startDate, setStartDate] = useState("");
  const [items, setItems] = useState<PassItem[]>(() => {
    const pre = prefillItems ?? [];
    return pre.length > 0
      ? pre.map((p) => ({ id: p.id, product: p.product, unit: p.unit, quantity: p.quantity }))
      : [emptyItem()];
  });

  function handleTypeChange(type: PassType) {
    if (selectedType === type) {
      setSelectedType(type);
      return;
    }
    setSelectedType(type);
    setItems([emptyItem()]);
  }

  function updateItem(id: string, patch: Partial<PassItem>) {
    setItems((prev) => {
      const updated = prev.map((it) => (it.id === id ? { ...it, ...patch } : it));
      const idx = updated.findIndex((it) => it.id === id);
      if (idx === updated.length - 1 && isFilled(updated[idx]) && updated.length < MAX_ITEMS) {
        updated.push(emptyItem());
      }
      return updated;
    });
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function handleProductCreate(title: string): { id: string; title: string } {
    const optimisticId = `optimistic-${Date.now()}`;
    productCreation.mutate(title, {
      onSuccess: (p) => {
        showToast(`ТМЦ «${p.title}» создан`, "success");
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

  function handleUnitCreate(title: string): { id: string; title: string } {
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

  async function handleSave() {
    const filledItems = items.filter(isFilled);
    if (filledItems.length === 0) {
      showToast("Добавьте хотя бы один товар", "error");
      return;
    }
    if (!startDate) {
      showToast("Выберите дату начала действия", "error");
      return;
    }

    const sheetName = SHEET_MAP[selectedType];
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const fmt = (d: Date) =>
      d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

    try {
      const resp = await fetch(TEMPLATE_URL);
      const buf = await resp.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);

      const allSheets = ["IN", "OUT", "IN_OUT"];
      allSheets.forEach((name) => {
        if (name !== sheetName) {
          const s = wb.getWorksheet(name);
          if (s) wb.removeWorksheet(s.id);
        }
      });

      const ws = wb.getWorksheet(sheetName);
      if (!ws) {
        showToast("Шаблон не содержит лист " + sheetName, "error");
        return;
      }

      ws.getCell("G56").value = fmt(start);
      ws.getCell("G57").value = fmt(end);

      filledItems.forEach((item, i) => {
        const row = 18 + i;
        if (row > 48) return;
        ws.getCell(`A${row}`).value = i + 1;
        ws.getCell(`B${row}`).value = item.product?.title || "";
        ws.getCell(`D${row}`).value = item.unit?.title || "";
        ws.getCell(`E${row}`).value = item.quantity ? Number(item.quantity) : "";
        ws.getCell(`F${row}`).value = item.quantity ? numToWordsUpper(Number(item.quantity)) : "";
      });

      const day = String(start.getDate()).padStart(2, "0");
      const month = String(start.getMonth() + 1).padStart(2, "0");
      const year = start.getFullYear();
      const fileName = `ПРОПУСК_${day}${month}${year}_1.xlsx`;

      const outBuf = await wb.xlsx.writeBuffer();
      const blob = new Blob([outBuf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      showToast("Пропуск сохранён", "success");
      onClose();
    } catch {
      showToast("Ошибка при сохранении файла", "error");
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pass-dialog-title"
          className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-lg sm:p-6"
        >
          <h3 id="pass-dialog-title" className="text-base font-semibold text-foreground">
            Создание пропуска
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Выберите дату начала действия и тип пропуска
          </p>

          <div className="mt-4">
            <DatePicker label="Дата начала действия" value={startDate} onChange={setStartDate} />
          </div>

          <div className="mt-4 space-y-2">
            {PASS_TYPES.map((type) => {
              const isActive = selectedType === type.id;
              return (
                <div key={type.id} className="rounded-lg border border-border">
                  <label
                    className={`flex cursor-pointer items-center gap-3 p-4 transition-colors rounded-t-lg ${
                      isActive ? "bg-primary/5" : "hover:bg-surface-secondary rounded-lg"
                    }`}
                  >
                    <input
                      type="radio"
                      name="passType"
                      value={type.id}
                      checked={isActive}
                      onChange={() => handleTypeChange(type.id)}
                      className="accent-primary"
                    />
                    <div className="flex flex-1 items-center gap-2">
                      <span className="text-sm text-text-secondary">🚛</span>
                      <span className="font-medium text-foreground">{type.label}</span>
                    </div>
                    {isActive && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 text-text-secondary">
                        <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>

                  {isActive && (
                    <div className="space-y-3 border-t border-border p-4 rounded-b-lg">
                      {items.map((item, idx) => (
                        <div key={item.id} className="items-end gap-3 max-sm:space-y-3 sm:grid sm:grid-cols-[1fr_120px_1fr_32px]">
                          <div>
                            {idx === 0 && <label className="mb-1 block text-xs text-text-secondary">Товар</label>}
                            <Autocomplete
                              placeholder="Поиск товара..."
                              items={
                                productCreation.isPending
                                  ? [...products, { id: "pending", title: "Сохранение..." }]
                                  : products
                              }
                              value={item.product}
                              onSelect={(p) => updateItem(item.id, { product: p })}
                              onCreate={handleProductCreate}
                            />
                          </div>
                          <div>
                            {idx === 0 && <label className="mb-1 block text-xs text-text-secondary">Количество</label>}
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                              onWheel={(e) => (e.target as HTMLInputElement).blur()}
                              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              {idx === 0 && <label className="mb-1 block text-xs text-text-secondary">Единица</label>}
                              <Autocomplete
                                placeholder="Единица..."
                                items={
                                  unitCreation.isPending
                                    ? [...units, { id: "pending", title: "Сохранение..." }]
                                    : units
                                }
                                value={item.unit}
                                onSelect={(u) => updateItem(item.id, { unit: u })}
                                onCreate={handleUnitCreate}
                              />
                            </div>
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="mt-auto flex h-9 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors enabled:hover:bg-red-50 enabled:hover:text-red-500 max-sm:h-11 max-sm:w-11"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 max-sm:size-5">
                                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      <div className="text-xs text-text-secondary">
                        {items.filter(isFilled).length} / {MAX_ITEMS}
                      </div>

                      <button
                        type="button"
                        onClick={handleSave}
                        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary max-sm:min-h-11"
                      >
                        Сохранить пропуск
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-secondary max-sm:min-h-11"
          >
            Закрыть
          </button>
        </div>
      </div>
    </>
  );
}