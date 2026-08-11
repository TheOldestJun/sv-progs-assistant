/*
 * OrderStatusTable — таблица заявок с управлением статусами позиций.
 *
 * Режимы (props):
 * - warehouseMode: склад видит RECEIVED / SENT_TO_REQUESTER / ORDER_CONFIRMED
 * - requesterMode: заявитель видит свой заказ, для позиций SENT_TO_REQUESTER
 *   отображается кнопка «Подтвердить получение» (SENT_TO_REQUESTER → ORDER_CONFIRMED)
 * - readOnly: только просмотр без возможности изменения статусов
 *
 * Выбор позиций для создания пропуска (bulk action bar):
 * - passSelectionStatuses: статусы, в которых позиции можно отметить чекбоксом.
 *   Склад: RECEIVED (поставка пришла). Снабжение/начальник снабжения: SHIPPED.
 * - passType: "import" — пропуск фиксирован «Ввоз» (снабжение/начальник снабжения),
 *   "import_with_export" — фиксирован «Ввоз/Вывоз» без выбора (склад).
 *
 * Для снабжения (supply) рядом с названием ТМЦ отображается иконка ? —
 * задать вопрос заявителю через внутренний чат (см. AskQuestionDialog).
 *
 * Используется в SupplyDeptDashboard, HeadOfSupplyDashboard,
 * WarehouseDashboard (warehouseMode), RequesterDashboard (requesterMode).
 */
"use client";

import { useMemo, useState } from "react";
import { useOrders, useUpdateOrderItemStatus, fetchItemLogs, STATUS_LABELS, type StatusLogEntry } from "@/hooks/useOrders";
import type { OrderItemStatus } from "@prisma/client";
import { useDeleteOrder } from "@/hooks/useDeleteOrder";
import { useBatchApprove } from "@/hooks/useBatchApprove";
import { useBatchAccept } from "@/hooks/useBatchAccept";
import { useToast } from "@/components/ui/Toast";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconSearch } from "@/components/ui/Icon";
import { StatusChangeDialog } from "@/components/dashboard/StatusChangeDialog";
import { BatchApproveDialog } from "@/components/dashboard/BatchApproveDialog";
import { BatchAcceptDialog } from "@/components/dashboard/BatchAcceptDialog";
import { EditProductDialog } from "@/components/dashboard/EditProductDialog";
import { OrderCardHeader } from "@/components/dashboard/OrderCardHeader";
import { OrderItemRow } from "@/components/dashboard/OrderItemRow";
import { ConfirmLinkDialog } from "@/components/dashboard/ConfirmLinkDialog";
import { AskQuestionDialog } from "@/components/dashboard/AskQuestionDialog";
import { StatusMenu, getStatusChoices } from "@/components/dashboard/StatusMenu";
import { downloadRequestExcel } from "@/components/orders/requestExcel";
import { PassFormDialog, type PassItem } from "@/components/passes/PassFormDialog";
import type { Order } from "@/hooks/useOrders";

const PAGE_SIZE = 10;
const FINAL_STATUSES = new Set(["RECEIVED", "SENT_TO_REQUESTER", "ORDER_CONFIRMED"]);

export function OrderStatusTable({
  warehouseMode = false,
  readOnly = false,
  requesterMode = false,
  showDirectorateOptions = false,
  passSelectionStatuses,
  passType = "import_with_export",
}: {
  warehouseMode?: boolean;
  readOnly?: boolean;
  requesterMode?: boolean;
  showDirectorateOptions?: boolean;
  /** Статусы позиций, которые можно отметить для создания пропуска (по умолчанию выбор отключён) */
  passSelectionStatuses?: OrderItemStatus[];
  /** Тип пропуска (фиксируется, выбора нет): "import" — «Ввоз» (снабжение), "import_with_export" — «Ввоз/Вывоз» (склад) */
  passType?: "import" | "import_with_export";
}) {
  const { data: orders, isLoading, isError, error } = useOrders();
  const updateStatus = useUpdateOrderItemStatus();
  const deleteOrder = useDeleteOrder();
  const batchApprove = useBatchApprove();
  const batchAccept = useBatchAccept();
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();

  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [logsMap, setLogsMap] = useState<Record<string, StatusLogEntry[]>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [pendingChange, setPendingChange] = useState<{
    itemId: string; orderId: string; targetStatus: OrderItemStatus;
    currentStatus: OrderItemStatus; productTitle: string;
  } | null>(null);

  const [pendingBatchApprove, setPendingBatchApprove] = useState<string | null>(null);

  const [pendingBatchAccept, setPendingBatchAccept] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<{
    itemId: string; orderId: string; productId: string; productTitle: string;
  } | null>(null);

  const [confirmLink, setConfirmLink] = useState<{ token: string; orderId: string } | null>(null);

  const [askQuestion, setAskQuestion] = useState<{
    productTitle: string; quantity: number; unitTitle: string;
    requesterUserId: string; orderDate: string;
  } | null>(null);

  const [downloadingExcelId, setDownloadingExcelId] = useState<string | null>(null);

  // Выбранные позиции для создания пропуска (включается при заданном passSelectionStatuses)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [passDialogOpen, setPassDialogOpen] = useState(false);

  // Режим выбора активен только когда задан список допустимых статусов
  const selectionEnabled = !!passSelectionStatuses && passSelectionStatuses.length > 0;

  // Подсказка на невыбираемых позициях: «Только позиции со статусом «…»»
  const selectionHint = useMemo(() => {
    if (!selectionEnabled) return undefined;
    const labels = passSelectionStatuses!.map((s) => STATUS_LABELS[s]).join(" или ");
    return `Только позиции со статусом «${labels}»`;
  }, [selectionEnabled, passSelectionStatuses]);

  function toggleSelected(itemId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }

  function clearSelected() {
    setSelectedIds(new Set());
  }

  // Скачивание заявки в Excel по шаблону REQUEST.xlsx (для «Мои заявки»)
  async function handleOrderExcel(order: Order) {
    setDownloadingExcelId(order.id);
    try {
      await downloadRequestExcel({
        date: order.created.slice(0, 10),
        items: order.items.map((it) => ({
          title: it.product.title,
          unitTitle: it.units.title,
          quantity: it.quantity,
        })),
        requesterName: order.requester.name,
      });
      showToast("Заявка сохранена в Excel", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ошибка при сохранении файла", "error");
    } finally {
      setDownloadingExcelId(null);
    }
  }

  function openMenu(itemId: string, buttonEl: HTMLButtonElement) {
    if (openSelect === itemId) { setOpenSelect(null); setMenuPos(null); return; }
    const rect = buttonEl.getBoundingClientRect();
    const item = itemsMap.get(itemId);
    const statusChoices = item ? getStatusChoices(item.status, warehouseMode, showDirectorateOptions, requesterMode) : [];
    if (statusChoices.length === 0) return;
    const menuHeight = statusChoices.length * 36 + 16;
    const menuWidth = 224;
    const left = rect.left + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 8 : rect.left;
    const top = rect.bottom + 4 + menuHeight > window.innerHeight ? rect.top - menuHeight : rect.bottom + 4;
    setMenuPos({ top, left });
    setOpenSelect(itemId);
  }

  function closeMenu() { setOpenSelect(null); setMenuPos(null); }

  function toggleItem(itemId: string, orderId: string) {
    if (expandedItem === itemId) { setExpandedItem(null); return; }
    setExpandedItem(itemId);
    if (!logsMap[itemId]) {
      fetchItemLogs(orderId, itemId)
        .then((logs) => setLogsMap((p) => ({ ...p, [itemId]: logs })))
        .catch(() => setLogsMap((p) => ({ ...p, [itemId]: [] })));
    }
  }

  function handleStatusClick(itemId: string, orderId: string, currentStatus: OrderItemStatus, targetStatus: OrderItemStatus, productTitle: string) {
    closeMenu();
    setPendingChange({ itemId, orderId, targetStatus, currentStatus, productTitle });
  }

  function handleStatusConfirm(changedAt: string) {
    if (!pendingChange) return;
    updateStatus.mutate(
      { orderId: pendingChange.orderId, itemId: pendingChange.itemId, status: pendingChange.targetStatus, warehouseMode, changedAt },
      {
        onSuccess: (data: { confirmationToken?: string }) => {
          showToast(`Статус изменён на «${STATUS_LABELS[pendingChange.targetStatus]}»`, "success");
          if (data.confirmationToken) setConfirmLink({ token: data.confirmationToken, orderId: pendingChange.orderId });
          setPendingChange(null);
        },
        onError: (err) => { showToast(err.message, "error"); setPendingChange(null); },
      },
    );
  }

  function handleStatusCancel() { setPendingChange(null); }

  async function handleDeleteOrder(orderId: string) {
    const ok = await confirm({ title: "Удаление заявки", message: "Заявка будет полностью удалена. Продолжить?", confirmText: "Удалить", variant: "danger" });
    if (!ok) return;
    deleteOrder.mutate(orderId, {
      onSuccess: () => showToast("Заявка удалена", "success"),
      onError: (err) => showToast(err.message, "error"),
    });
  }

  function handleApproveConfirm(changedAt: string) {
    if (!pendingBatchApprove) return;
    batchApprove.mutate(
      { orderId: pendingBatchApprove, changedAt },
      {
        onSuccess: (data) => {
          showToast(`Одобрено ${data.count} позиций`, "success");
          setPendingBatchApprove(null);
        },
        onError: (err) => {
          showToast(err.message || "Ошибка при одобрении", "error");
          setPendingBatchApprove(null);
        },
      },
    );
  }

  function handleBatchApproveCancel() {
    setPendingBatchApprove(null);
  }

  function handleAcceptConfirm(changedAt: string) {
    if (!pendingBatchAccept) return;
    batchAccept.mutate(
      { orderId: pendingBatchAccept, changedAt },
      {
        onSuccess: (data) => {
          showToast(`Принято в работу ${data.count} позиций`, "success");
          setPendingBatchAccept(null);
        },
        onError: (err) => {
          showToast(err.message || "Ошибка при принятии в работу", "error");
          setPendingBatchAccept(null);
        },
      },
    );
  }

  function handleBatchAcceptCancel() {
    setPendingBatchAccept(null);
  }

  const filtered = useMemo(() => {
    if (!orders) return [];
    let result = orders;
    if (warehouseMode) {
      const ws = new Set(["SHIPPED", "RECEIVED", "SENT_TO_REQUESTER"]);
      result = result.map((o) => ({ ...o, items: o.items.filter((it) => ws.has(it.status)) })).filter((o) => o.items.length > 0);
    }
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(
      (o) => o.requester.name.toLowerCase().includes(q) || o.items.some((it) => it.product.title.toLowerCase().includes(q)),
    );
  }, [orders, search, warehouseMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const itemsMap = useMemo(() => {
    type OrderItem = NonNullable<typeof orders>[number]["items"][number];
    const map = new Map<string, OrderItem>();
    if (!orders) return map;
    for (const o of orders) for (const item of o.items) map.set(item.id, item);
    return map;
  }, [orders]);

  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Выбранные позиции в формате PassFormDialog (warehouseMode)
  const passPrefill: PassItem[] = useMemo(() => {
    if (!orders || selectedIds.size === 0) return [];
    const result: PassItem[] = [];
    for (const o of orders) {
      for (const item of o.items) {
        if (!selectedIds.has(item.id)) continue;
        result.push({
          id: `pass_${item.id}`,
          product: { id: item.productId, title: item.product.title },
          unit: { id: item.unitId, title: item.units.title },
          quantity: String(item.quantity),
        });
        if (result.length === 31) return result; // MAX_ITEMS в PassFormDialog
      }
    }
    return result;
  }, [orders, selectedIds]);

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );

  if (isError) return (
    <div className="rounded-lg border border-dashed border-red-300 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
      Ошибка загрузки: {error instanceof Error ? error.message : "Неизвестная ошибка"}
    </div>
  );

  if (!orders || orders.length === 0) return (
    <div className="rounded-lg border border-dashed border-border bg-surface-secondary p-6 text-center">
      <p className="text-sm text-text-secondary">Пока нет ни одной заявки</p>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-1">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Поиск по заявителю или продукту..."
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {selectionEnabled && selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            Выбрано: {selectedIds.size}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelected}
              className="rounded-md px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-secondary max-sm:min-h-11"
            >
              Сбросить
            </button>
            <button
              onClick={() => setPassDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover max-sm:min-h-11"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M2.5 3A1.5 1.5 0 0 1 4 1.5h11A1.5 1.5 0 0 1 16.5 3v1.62c.13.11.26.24.37.38l1.5 1.88A1.5 1.5 0 0 1 18.7 8.5V9a5 5 0 1 1-10 0v-.5c0-.53.21-1.01.55-1.36l1.5-1.88c.1-.14.23-.27.36-.38V3Zm-1 6.22V10a7 7 0 1 0 14 0v-.78l-.88-1.1a1 1 0 0 0-.62-.37V3h-11v4.75a1 1 0 0 0-.62.38L1.5 9.22Z" clipRule="evenodd" />
                <path d="M4 11.5a7.51 7.51 0 0 0 1.74 4.6L4 15.06A7 7 0 0 1 4 11.5Zm9.7 4.6A7.51 7.51 0 0 0 16 11.5v3.56l-1.74 1.74-1.56.3Z" />
              </svg>
              {passType === "import" ? "Создать пропуск на ввоз" : "Создать пропуск на ввоз/вывоз"}
            </button>
          </div>
        </div>
      )}

      {paged.map((order) => (
        <div key={order.id} className="overflow-hidden rounded-lg border border-border">
          <OrderCardHeader
            requesterName={order.requester.name}
            created={order.created}
            totalQuantity={order.items.reduce((s, it) => s + it.quantity, 0)}
            readOnly={readOnly}
            allFinished={requesterMode
              ? order.items.every((it) => FINAL_STATUSES.has(it.status) || it.status === "PENDING_DIRECTORATE")
              : order.items.every((it) => FINAL_STATUSES.has(it.status))}
            deletePending={deleteOrder.isPending}
            onDelete={() => handleDeleteOrder(order.id)}
            showApprove={showDirectorateOptions && order.items.some((it) => it.status === "PENDING_DIRECTORATE")}
            approvePending={batchApprove.isPending}
            onApprove={() => setPendingBatchApprove(order.id)}
            showAccept={showDirectorateOptions && order.items.some((it) => it.status === "DIRECTORATE_APPROVED")}
            acceptPending={batchAccept.isPending}
            onAccept={() => setPendingBatchAccept(order.id)}
            showExcel={requesterMode}
            excelPending={downloadingExcelId === order.id}
            onExcel={() => handleOrderExcel(order)}
          />

          <div className="max-sm:border-t max-sm:border-border">
            <table className="w-full min-w-0 text-sm">
              <thead className="bg-surface max-sm:hidden">
                <tr>
                  <th className="px-2 py-1.5 sm:px-4 sm:py-0.5 text-left font-medium text-text-secondary">ТМЦ</th>
                  <th className="w-16 px-2 py-1.5 sm:px-4 sm:py-0.5 text-left font-medium text-text-secondary">Ед.</th>
                  <th className="w-20 px-2 py-1.5 sm:px-4 sm:py-0.5 text-right font-medium text-text-secondary">Кол-во</th>
                  <th className="w-44 px-2 py-1.5 sm:px-4 sm:py-0.5 text-left font-medium text-text-secondary">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c8ccd0] dark:divide-[#3a3a4e]">
                {order.items.map((item) => (
                  <OrderItemRow
                    key={item.id}
                    item={item}
                    readOnly={readOnly}
                    requesterMode={requesterMode}
                    expanded={expandedItem === item.id}
                    logs={logsMap[item.id]}
                    isPending={updateStatus.isPending}
                    onToggle={() => toggleItem(item.id, order.id)}
                    onOpenMenu={(el) => openMenu(item.id, el)}
                    onConfirmReceipt={() => setPendingChange({
                      itemId: item.id, orderId: item.orderId,
                      targetStatus: "ORDER_CONFIRMED" as OrderItemStatus,
                      currentStatus: item.status, productTitle: item.product.title,
                    })}
                    onEditProduct={() => setEditingProduct({
                      itemId: item.id, orderId: order.id,
                      productId: item.productId, productTitle: item.product.title,
                    })}
                    onAskRequester={!requesterMode && order.requester.userId ? () => setAskQuestion({
                      productTitle: item.product.title,
                      quantity: item.quantity,
                      unitTitle: item.units.title,
                      requesterUserId: order.requester.userId!,
                      orderDate: order.created.slice(0, 10),
                    }) : undefined}
                    selectable={selectionEnabled && passSelectionStatuses!.includes(item.status)}
                    selectionHint={selectionHint}
                    selected={selectionEnabled ? selectedIds.has(item.id) : undefined}
                    onSelectChange={selectionEnabled ? toggleSelected : undefined}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 text-sm text-text-secondary">
          <span>{safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} из {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} className="rounded-md px-3 py-1.5 text-sm max-sm:py-2 transition-colors hover:bg-surface-secondary disabled:opacity-30 max-sm:min-h-11">← Назад</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)} className={`rounded-md px-3 py-1.5 text-sm max-sm:py-2 transition-colors max-sm:min-h-11 ${i === safePage ? "bg-primary text-primary-foreground" : "hover:bg-surface-secondary"}`}>{i + 1}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage === totalPages - 1} className="rounded-md px-3 py-1.5 text-sm max-sm:py-2 transition-colors hover:bg-surface-secondary disabled:opacity-30 max-sm:min-h-11">Вперед →</button>
          </div>
        </div>
      )}

      {pendingBatchApprove && (
        <BatchApproveDialog
          open
          onConfirm={handleApproveConfirm}
          onCancel={handleBatchApproveCancel}
        />
      )}

      {pendingBatchAccept && (
        <BatchAcceptDialog
          open
          onConfirm={handleAcceptConfirm}
          onCancel={handleBatchAcceptCancel}
        />
      )}

      {pendingChange && (
        <StatusChangeDialog
          open
          productTitle={pendingChange.productTitle}
          currentStatus={pendingChange.currentStatus}
          targetStatus={pendingChange.targetStatus}
          orderId={pendingChange.orderId}
          itemId={pendingChange.itemId}
          requesterMode={requesterMode}
          onConfirm={handleStatusConfirm}
          onCancel={handleStatusCancel}
        />
      )}

      {editingProduct && (
        <EditProductDialog
          open
          productId={editingProduct.productId}
          productTitle={editingProduct.productTitle}
          orderId={editingProduct.orderId}
          itemId={editingProduct.itemId}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {confirmLink && (
        <ConfirmLinkDialog
          token={confirmLink.token}
          onClose={() => setConfirmLink(null)}
        />
      )}

      {askQuestion && (
        <AskQuestionDialog
          open
          productTitle={askQuestion.productTitle}
          quantity={askQuestion.quantity}
          unitTitle={askQuestion.unitTitle}
          requesterUserId={askQuestion.requesterUserId}
          orderDate={askQuestion.orderDate}
          onClose={() => setAskQuestion(null)}
        />
      )}

      {openSelect && menuPos && (
        <StatusMenu
          openItemId={openSelect}
          position={menuPos}
          warehouseMode={warehouseMode}
          showDirectorateOptions={showDirectorateOptions}
          requesterMode={requesterMode}
          itemsMap={itemsMap}
          onSelect={handleStatusClick}
          onClose={closeMenu}
        />
      )}

      {passDialogOpen && (
        <PassFormDialog
          open
          prefillItems={passPrefill}
          lockedType={passType === "import" ? "import" : "import_with_export"}
          onClose={() => { setPassDialogOpen(false); clearSelected(); }}
        />
      )}
    </div>
  );
}
