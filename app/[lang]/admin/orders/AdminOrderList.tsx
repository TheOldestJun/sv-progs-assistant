/*
 * AdminOrderList — таблица заявок с редактированием даты, статуса и количества позиций
 */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { useToast } from "@/components/ui/Toast";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  STATUS_ORDER,
  type OrderItemStatus,
} from "@/hooks/useOrders";

function StatusIcon({ status, className }: { status: OrderItemStatus; className?: string }) {
  const cls = `size-3.5 shrink-0 ${className || ""}`;
  switch (status) {
    case "ACCEPTED":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cls}>
          <path fillRule="evenodd" d="M6 2.75A.75.75 0 0 1 6.75 2h6.5a.75.75 0 0 1 0 1.5h-2.5v1.75c0 .69-.56 1.25-1.25 1.25h-1.5a.75.75 0 0 1 0-1.5h.5V3.5h-2A.75.75 0 0 1 6 2.75ZM6 7a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 6 7Zm0 3a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 6 10Zm6 2.25a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5h3.5Z" clipRule="evenodd" />
          <path d="M11.5 15.25a.75.75 0 0 0 0 1.5h.75a.75.75 0 0 0 0-1.5h-.75Z" />
          <path d="M3.5 3.5A1.5 1.5 0 0 0 2 5v10a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V5a1.5 1.5 0 0 0-1.5-1.5h-8Zm0 1.5h8a.25.25 0 0 1 .25.25v10a.25.25 0 0 1-.25.25h-8a.25.25 0 0 1-.25-.25V5a.25.25 0 0 1 .25-.25Z" />
        </svg>
      );
    case "INVOICE_RECEIVED":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cls}>
          <path d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13.256c0 .72.514 1.338 1.215 1.482a7.516 7.516 0 0 0 3.57-.372 7.5 7.5 0 0 1 4.43 0 7.516 7.516 0 0 0 3.57.372c.701-.144 1.215-.762 1.215-1.482V3.5A1.5 1.5 0 0 0 15.5 2h-11Zm3.75 3.75a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1 0-1.5h2.5ZM7 8.5a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 7 8.5Zm-1.5 3.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" />
        </svg>
      );
    case "INVOICE_PAID":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cls}>
          <path fillRule="evenodd" d="M2.5 4A1.5 1.5 0 0 0 1 5.5V6h18v-.5A1.5 1.5 0 0 0 17.5 4h-15ZM1 10.25V14a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 19 14v-3.75h-4.5a2.5 2.5 0 0 1-5 0H1Zm15.5 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          <path d="M11.5 10.25a1.5 1.5 0 0 1-3 0H1V7h18v3.25h-7.5Z" />
        </svg>
      );
    case "SHIPPED":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cls}>
          <path d="M6.5 3c-1.051 0-2.093.04-3.125.117A1.49 1.49 0 0 0 2 4.607V10.5h4.75a.75.75 0 0 1 .75.75v3.25h1.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75V12H3.5v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463C4.286 3.07 5.436 3 6.5 3ZM17.5 4.607c0-.72-.514-1.34-1.223-1.463A24.7 24.7 0 0 0 12.5 3c-1.064 0-2.116.033-3.152.115C8.173 3.206 7.5 3.976 7.5 4.726V10.5h3.75a.75.75 0 0 1 .75.75v3.25h.625a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75V12H10v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463A24.7 24.7 0 0 1 12.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V12h-2.25v2.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H9V12H2.5v2.25a.75.75 0 0 1-1.5 0V4.607c0-.72.514-1.34 1.223-1.463C3.286 3.07 4.436 3 5.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V10.5h3.75a.75.75 0 0 1 .75.75v3.25h.625a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75V12H10v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463A24.7 24.7 0 0 1 12.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V12h-2.25v2.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H9V12H2.5v2.25a.75.75 0 0 1-1.5 0V4.607c0-.72.514-1.34 1.223-1.463C3.286 3.07 4.436 3 5.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463A24.7 24.7 0 0 1 12.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V12h-2.25v2.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H9V12H2.5v2.25a.75.75 0 0 1-1.5 0V4.607c0-.72.514-1.34 1.223-1.463C3.286 3.07 4.436 3 5.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463A24.7 24.7 0 0 1 12.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V12h-2.25v2.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H9V12H2.5v2.25a.75.75 0 0 1-1.5 0V4.607c0-.72.514-1.34 1.223-1.463C3.286 3.07 4.436 3 5.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V12h-2.25v2.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H9V12H2.5v2.25a.75.75 0 0 1-1.5 0V4.607c0-.72.514-1.34 1.223-1.463C3.286 3.07 4.436 3 5.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463A24.7 24.7 0 0 1 12.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V10.5h3.75a.75.75 0 0 1 .75.75v3.25h.625a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75V12H10v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463A24.7 24.7 0 0 1 12.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V12h-2.25v2.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H9V12H2.5v2.25a.75.75 0 0 1-1.5 0V4.607c0-.72.514-1.34 1.223-1.463C3.286 3.07 4.436 3 5.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V12h-3.5v1.25a.75.75 0 0 1-1.5 0V4.726c0-.72.514-1.34 1.223-1.463A24.7 24.7 0 0 1 12.5 3c1.064 0 2.116.033 3.152.115.709.123 1.223.743 1.223 1.463V10.5h-7.5a.75.75 0 0 1-.75-.75V6.5a.75.75 0 0 1 .75-.75H12V3.5a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v3h2.25V4.607c0-.72-.514-1.34-1.223-1.463A24.7 24.7 0 0 0 12.5 3c-1.064 0-2.116.033-3.152.115-.709.123-1.223.743-1.223 1.463V12h3.5v1.25a.75.75 0 0 1-1.5 0V12h-2.25v2.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H9V12H2.5v2.25a.75.75 0 0 1-1.5 0V4.607c0-.72.514-1.34 1.223-1.463C3.286 3.07 4.436 3 5.5 3Z" />
        </svg>
      );
    case "RECEIVED":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={cls}>
          <path d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 0 0-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 0 0 0-1.5H5.378A2.25 2.25 0 0 1 7.5 15h11.218a.75.75 0 0 0 .674-.421 60.358 60.358 0 0 0 2.96-7.228.75.75 0 0 0-.525-.965A60.864 60.864 0 0 0 5.68 4.509l-.232-.867A1.875 1.875 0 0 0 3.636 2.25H2.25ZM6.75 17.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM15.75 17.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        </svg>
      );
  }
}

interface OrderItem {
  id: string;
  quantity: number;
  comment: string | null;
  status: string;
  product: { title: string };
  units: { title: string };
}

interface Order {
  id: string;
  created: string;
  requester: { name: string };
  createdBy: { name: string } | null;
  items: OrderItem[];
}

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  INVOICE_RECEIVED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  INVOICE_PAID: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  SHIPPED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  RECEIVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

async function updateItem(
  orderId: string,
  itemId: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.ok;
}

export function AdminOrderList({ orders: initial }: { orders: Order[] }) {
  const [orders, setOrders] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [itemSaving, setItemSaving] = useState<Record<string, boolean>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const [bumpItem, setBumpItem] = useState<{ orderId: string; itemId: string; productName: string } | null>(null);
  const [bumpReason, setBumpReason] = useState("");

  const tToast = useTranslations("toasts");
  const tTable = useTranslations("dashboard.table");
  const tOrders = useTranslations("admin.orders");
  const tStatuses = useTranslations("statuses");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setMenuPos(null);
      }
    }
    if (openMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenu]);

  function startEdit(order: Order) {
    setEditingId(order.id);
    setEditDate(order.created.slice(0, 10));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDate("");
  }

  async function saveDate(orderId: string) {
    if (!editDate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ created: editDate }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || tCommon("error"));
      }
      const data = await res.json();
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, created: data.created } : o)),
      );
      setEditingId(null);
      showToast(tToast("dateSaved"), "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : tCommon("error"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(
    orderId: string,
    itemId: string,
    newStatus: string,
  ) {
    setItemSaving((prev) => ({ ...prev, [itemId]: true }));
    const ok = await updateItem(orderId, itemId, { status: newStatus });
    if (ok) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                items: o.items.map((it) =>
                  it.id === itemId ? { ...it, status: newStatus } : it,
                ),
              }
            : o,
        ),
      );
      showToast(tToast("statusChanged", { status: tStatuses(newStatus as OrderItemStatus) }), "success");
    } else {
      showToast(tToast("statusChangeError"), "error");
    }
    setItemSaving((prev) => ({ ...prev, [itemId]: false }));
    setOpenMenu(null);
    setMenuPos(null);
  }

  function handleBumpClick(orderId: string, itemId: string, productName: string) {
    setBumpItem({ orderId, itemId, productName });
    setBumpReason("");
  }

  async function handleBumpConfirm() {
    if (!bumpItem) return;
    const { orderId, itemId } = bumpItem;
    const reason = bumpReason.trim();
    if (!reason) {
      showToast(tToast("specifyReason"), "error");
      return;
    }

    const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, items: o.items.filter((it) => it.id !== itemId) }
            : o,
        ),
      );
      setBumpItem(null);
      showToast(tToast("itemMoved"), "success");
    } else {
      const err = await res.json();
      showToast(err.error || tCommon("error"), "error");
    }
  }

  async function handleQuantityChange(
    orderId: string,
    itemId: string,
    quantity: number,
  ) {
    if (isNaN(quantity) || quantity <= 0) {
      showToast(tToast("quantityPositive"), "error");
      return;
    }
    setItemSaving((prev) => ({ ...prev, [itemId]: true }));
    const ok = await updateItem(orderId, itemId, { quantity });
    if (ok) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                items: o.items.map((it) =>
                  it.id === itemId ? { ...it, quantity } : it,
                ),
              }
            : o,
        ),
      );
      showToast(tToast("quantitySaved"), "success");
    } else {
      showToast(tToast("quantitySaveError"), "error");
    }
    setItemSaving((prev) => ({ ...prev, [itemId]: false }));
  }

  if (orders.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        {tOrders("empty")}
      </p>
    );
  }

  return (
    <>
    <div className="overflow-x-auto">
      {openMenu && menuPos && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setOpenMenu(null); setMenuPos(null); }} />
          <div
            ref={menuRef}
            className="fixed z-40 w-56 rounded-lg border border-border bg-surface py-1 shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {(() => {
              const currentItem = orders.flatMap(o => o.items).find(i => i.id === openMenu);
              const currentOrder = orders.find(o => o.items.some(i => i.id === openMenu));
              return STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (currentItem && currentOrder) {
                      handleStatusChange(currentOrder.id, openMenu, s);
                    }
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-surface-secondary ${
                    currentItem?.status === s
                      ? "font-semibold text-foreground"
                      : "text-text-secondary"
                  }`}
                >
                  <StatusIcon status={s as OrderItemStatus} />
                  {tStatuses(s as OrderItemStatus)}
                </button>
              ));
            })()}
          </div>
        </>
      )}
      <table className="w-full text-sm">
        <thead className="bg-surface">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-text-secondary">{tTable("date")}</th>
            <th className="px-3 py-2 text-left font-medium text-text-secondary">{tTable("requester")}</th>
            <th className="px-3 py-2 text-left font-medium text-text-secondary">{tTable("creator")}</th>
            <th className="px-3 py-2 text-right font-medium text-text-secondary">{tTable("positions")}</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((order) => {
            const isEditing = editingId === order.id;
            const isExpanded = expandedId === order.id;
            return (
              <React.Fragment key={order.id}>
                <tr className="hover:bg-surface">
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <DatePicker
                        label=""
                        value={editDate}
                        onChange={setEditDate}
                      />
                    ) : (
                      <span className="text-foreground">
                        {new Date(order.created).toLocaleDateString(locale)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-foreground">{order.requester.name}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {order.createdBy?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-text-secondary">
                    {order.items.length}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary max-sm:min-h-11"
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                      {isEditing ? (
                        <>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary disabled:opacity-50 max-sm:min-h-11"
                          >
                            {tCommon("cancel")}
                          </button>
                          <button
                            onClick={() => saveDate(order.id)}
                            disabled={saving}
                            className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 max-sm:min-h-11"
                          >
                            {saving ? "…" : tCommon("save")}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEdit(order)}
                          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-secondary max-sm:min-h-11"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={6} className="bg-surface-secondary px-3 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-text-secondary">
                            <th className="px-2 py-1 text-left font-medium">{tTable("product")}</th>
                            <th className="px-2 py-1 text-left font-medium">{tTable("unit")}</th>
                            <th className="px-2 py-1 text-right font-medium">{tTable("quantity")}</th>
                            <th className="px-2 py-1 text-left font-medium">{tTable("status")}</th>
                            <th className="px-2 py-1 text-left font-medium">{tTable("comment")}</th>
                            <th className="px-2 py-1" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {order.items.map((item) => {
                            const isItemLoading = itemSaving[item.id];
                            return (
                              <tr key={item.id}>
                                <td className="px-2 py-1 text-foreground">
                                  {item.product.title}
                                </td>
                                <td className="px-2 py-1 text-text-secondary">
                                  {item.units.title}
                                </td>
                                <td className="px-2 py-1 text-right">
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    defaultValue={item.quantity}
                                    disabled={isItemLoading}
                                    onBlur={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (val !== item.quantity) {
                                        handleQuantityChange(order.id, item.id, val);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                    className="w-20 rounded border border-border bg-surface px-1.5 py-0.5 text-right text-foreground outline-none transition-colors focus:border-primary disabled:opacity-50"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <div className="relative inline-flex">
                                    <button
                                      onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setOpenMenu(item.id);
                                        setMenuPos({ top: rect.bottom + 4, left: rect.left });
                                      }}
                                      disabled={isItemLoading}
                                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-black/5 transition-colors ${STATUS_COLORS[item.status]} disabled:opacity-50 cursor-pointer`}
                                    >
                                      <StatusIcon status={item.status as OrderItemStatus} />
                                      {tStatuses(item.status as OrderItemStatus)}
                                    </button>
                                  </div>
                                </td>
                                <td className="px-2 py-1 text-text-secondary">
                                  {item.comment || "—"}
                                </td>
                                <td className="px-2 py-1 text-right">
                                  <button
                                    onClick={() => handleBumpClick(order.id, item.id, item.product.title)}
                                    disabled={isItemLoading}
                                    className="rounded-md px-2 py-0.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                                    title={tOrders("moveTitle")}
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>

      {/* Диалог переноса позиции */}
      {bumpItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setBumpItem(null)} />
          <div className="relative z-10 w-full max-w-md animate-fade-in overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800 dark:text-gray-100">
            <div className="p-6">
              <h2 className="text-base font-semibold text-foreground">
                {tOrders("moveTitle")}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                {tOrders("moveMessage", { product: bumpItem.productName })}
              </p>
              <label className="mt-4 block text-sm font-medium text-foreground">
                {tOrders("moveReason")}
              </label>
              <input
                type="text"
                value={bumpReason}
                onChange={(e) => setBumpReason(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleBumpConfirm(); }}
                placeholder={tOrders("moveReasonPlaceholder")}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-border bg-surface-secondary px-6 py-4">
              <button
                onClick={() => setBumpItem(null)}
                className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleBumpConfirm}
                className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                {tOrders("moveConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
