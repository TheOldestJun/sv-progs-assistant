/*
 * OrderStatusTable — таблица заявок с управлением статусами позиций.
 *
 * Режимы (props):
 * - warehouseMode: склад видит RECEIVED / SENT_TO_REQUESTER / ORDER_CONFIRMED
 * - requesterMode: заявитель видит свой заказ, для позиций SENT_TO_REQUESTER
 *   отображается кнопка «Подтвердить получение» (SENT_TO_REQUESTER → ORDER_CONFIRMED)
 * - readOnly: только просмотр без возможности изменения статусов
 *
 * Используется в SupplyDeptDashboard, HeadOfSupplyDashboard,
 * WarehouseDashboard (warehouseMode), RequesterDashboard (requesterMode).
 */
"use client";

import { useMemo, useState } from "react";
import { useOrders, useUpdateOrderItemStatus, fetchItemLogs, STATUS_LABELS, type StatusLogEntry } from "@/hooks/useOrders";
import type { OrderItemStatus } from "@prisma/client";
import { useDeleteOrder } from "@/hooks/useDeleteOrder";
import { useToast } from "@/components/ui/Toast";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconSearch } from "@/components/ui/Icon";
import { StatusChangeDialog } from "@/components/dashboard/StatusChangeDialog";
import { EditProductDialog } from "@/components/dashboard/EditProductDialog";
import { OrderCardHeader } from "@/components/dashboard/OrderCardHeader";
import { OrderItemRow } from "@/components/dashboard/OrderItemRow";
import { ConfirmLinkDialog } from "@/components/dashboard/ConfirmLinkDialog";
import { StatusMenu } from "@/components/dashboard/StatusMenu";

const PAGE_SIZE = 10;
const FINAL_STATUSES = new Set(["RECEIVED", "SENT_TO_REQUESTER", "ORDER_CONFIRMED"]);

export function OrderStatusTable({ warehouseMode = false, readOnly = false, requesterMode = false }: { warehouseMode?: boolean; readOnly?: boolean; requesterMode?: boolean }) {
  const { data: orders, isLoading, isError, error } = useOrders();
  const updateStatus = useUpdateOrderItemStatus();
  const deleteOrder = useDeleteOrder();
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

  const [editingProduct, setEditingProduct] = useState<{
    itemId: string; orderId: string; productId: string; productTitle: string;
  } | null>(null);

  const [confirmLink, setConfirmLink] = useState<{ token: string; orderId: string } | null>(null);

  function openMenu(itemId: string, buttonEl: HTMLButtonElement) {
    if (openSelect === itemId) { setOpenSelect(null); setMenuPos(null); return; }
    const rect = buttonEl.getBoundingClientRect();
    const statusChoices = warehouseMode ? ["RECEIVED", "SENT_TO_REQUESTER", "ORDER_CONFIRMED"] : [];
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
    const ok = await confirm({ title: "Архивирование заявки", message: "Заявка будет перемещена в архив. Вы сможете просмотреть её на вкладке «Архив».", confirmText: "Архивировать", variant: "danger" });
    if (!ok) return;
    deleteOrder.mutate(orderId, {
      onSuccess: () => showToast("Заявка удалена", "success"),
      onError: (err) => showToast(err.message, "error"),
    });
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

      {paged.map((order) => (
        <div key={order.id} className="overflow-hidden rounded-lg border border-border">
          <OrderCardHeader
            requesterName={order.requester.name}
            created={order.created}
            totalQuantity={order.items.reduce((s, it) => s + it.quantity, 0)}
            readOnly={readOnly}
            allFinished={order.items.every((it) => FINAL_STATUSES.has(it.status))}
            deletePending={deleteOrder.isPending}
            onDelete={() => handleDeleteOrder(order.id)}
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
              <tbody className="divide-y divide-border">
                {order.items.map((item) => (
                  <OrderItemRow
                    key={item.id}
                    item={item}
                    readOnly={readOnly}
                    requesterMode={requesterMode}
                    warehouseMode={warehouseMode}
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

      {pendingChange && (
        <StatusChangeDialog
          open
          productTitle={pendingChange.productTitle}
          currentStatus={pendingChange.currentStatus}
          targetStatus={pendingChange.targetStatus}
          orderId={pendingChange.orderId}
          itemId={pendingChange.itemId}
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

      {openSelect && menuPos && (
        <StatusMenu
          openItemId={openSelect}
          position={menuPos}
          warehouseMode={warehouseMode}
          itemsMap={itemsMap}
          onSelect={handleStatusClick}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
