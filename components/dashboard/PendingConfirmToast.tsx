/*
 * PendingConfirmToast — проверяет при монтировании, есть ли у текущего пользователя
 * заявки со статусом SENT_TO_REQUESTER. Если да — показывает info-тост с подсказкой.
 * Используется в layout дашборда.
 */
"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

export function PendingConfirmToast() {
  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/orders/my-pending-confirm")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.pending > 0) {
          showToast(
            `У вас ${data.pending} заяв${data.pending === 1 ? "ка" : "ки"} ожидают подтверждения получения. Откройте сообщения для подтверждения.`,
            "info",
            true,
          );
        }
      })
      .catch(() => {});
  }, [showToast]);

  return null;
}
