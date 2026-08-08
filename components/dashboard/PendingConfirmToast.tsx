/*
 * PendingConfirmToast — проверяет при монтировании, есть ли у текущего пользователя
 * заявки со статусом SENT_TO_REQUESTER. Если да — показывает info-тост с подсказкой.
 * Используется в layout дашборда.
 */
"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { pluralRu } from "@/app/lib/format";

export function PendingConfirmToast() {
  const { showToast } = useToast();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;

    fetch("/api/orders/my-pending-confirm")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.pending > 0) {
          const word = pluralRu(data.pending, ["заявка", "заявки", "заявок"]);
          showToast(
            `У вас ${data.pending} ${word} ожидают подтверждения получения. Откройте заявки для подтверждения.`,
            "info",
            true,
          );
        }
      })
      .catch(() => {});
  }, [showToast]);

  return null;
}
