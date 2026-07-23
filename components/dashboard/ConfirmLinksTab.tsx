/*
 * ConfirmLinksTab — вкладка «Ожидание подтверждения» в дашборде склада.
 * Показывает все неиспользованные токены подтверждения по каждому пункту заявки.
 * Позволяет копировать ссылку для повторной отправки заявителю.
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface ConfirmLink {
  tokenId: string;
  token: string;
  createdAt: string;
  orderId: string;
  orderDate: string;
  requester: {
    id: string;
    name: string;
    isUser: boolean;
  };
  item: {
    id: string;
    product: string;
    unit: string;
    quantity: number;
    status: string;
  };
}

function getConfirmUrl(token: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/confirm/${token}`;
  }
  return `/confirm/${token}`;
}

export function ConfirmLinksTab() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: links = [], isLoading } = useQuery<ConfirmLink[]>({
    queryKey: ["confirm-tokens"],
    queryFn: async () => {
      const res = await fetch("/api/orders/confirm-tokens");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  async function copyLink(token: string, tokenId: string) {
    const url = getConfirmUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(tokenId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiedId(tokenId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="size-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        Нет позиций, ожидающих подтверждения получения
      </p>
    );
  }

  // Группируем по заявкам
  const grouped = links.reduce<Record<string, ConfirmLink[]>>((acc, link) => {
    (acc[link.orderId] ??= []).push(link);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([orderId, items]) => {
        const first = items[0];
        return (
          <div
            key={orderId}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {first.requester.name}
                  {first.requester.isUser && (
                    <span className="ml-1.5 text-xs text-text-secondary">(пользователь)</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Заявка от {new Date(first.orderDate).toLocaleDateString("ru-RU")}
                </p>
              </div>
            </div>

            {/* Позиции по отдельности */}
            <div className="space-y-2">
              {items.map((link) => (
                <div
                  key={link.tokenId}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">
                      {link.item.product}
                    </p>
                    <p className="text-[11px] text-text-secondary">
                      {link.item.quantity} {link.item.unit}
                    </p>
                  </div>

                  <button
                    onClick={() => copyLink(link.token, link.tokenId)}
                    className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                      copiedId === link.tokenId
                        ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300"
                        : "border-border bg-surface text-foreground hover:bg-surface-secondary"
                    }`}
                  >
                    {copiedId === link.tokenId ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                        </svg>
                        Скопировано
                      </>
                    ) : (
                      "🔗 Ссылка"
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
