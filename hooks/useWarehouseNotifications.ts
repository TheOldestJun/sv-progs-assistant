/*
 * Hook: useWarehouseNotifications
 * - Если isWarehouse === true:
 *   1. Запрашивает разрешение на браузерные уведомления
 *   2. Каждые 5 минут проверяет новые SHIPPED позиции (через invalidateQueries)
 *   3. При появлении новых: браузерное уведомление + звуковой сигнал + toast
 * - Если isWarehouse === false — не делает ничего
 */
"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOrders } from "./useOrders";
import { useToast } from "@/components/ui/Toast";

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // AudioContext может быть недоступен (до взаимодействия с пользователем)
  }
}

export function useWarehouseNotifications(isWarehouse: boolean) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  /*
   * knownIdsRef — SHIPPED id, которые мы уже видели.
   * initialLoadRef — первый загрузка: запоминаем ID, но не уведомляем.
   */
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  /* Запрос разрешения на браузерные уведомления при первом монтировании */
  useEffect(() => {
    if (!isWarehouse) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isWarehouse]);

  /* Подписываемся на useOrders (общий кеш с OrderStatusTable) */
  const { data: orders } = useOrders();

  /* При обновлении данных — сравниваем с knownIds */
  useEffect(() => {
    if (!isWarehouse || !orders) return;
    if (typeof window === "undefined") return;

    /* Собираем текущие SHIPPED позиции */
    const currentShipped = new Set<string>();
    const newItems: { id: string; product: string; requester: string }[] = [];

    for (const order of orders) {
      for (const item of order.items || []) {
        if (item.status !== "SHIPPED") continue;
        currentShipped.add(item.id);
        if (!knownIdsRef.current.has(item.id)) {
          newItems.push({
            id: item.id,
            product: item.product.title,
            requester: order.requester.name,
          });
        }
      }
    }

    /* Обновляем knownIds — убираем id, которые больше не SHIPPED */
    knownIdsRef.current = currentShipped;

    /* Первая загрузка — только запоминаем, без уведомления */
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    if (newItems.length === 0) return;

    /* === Уведомления === */
    playBeep();

    const first = newItems[0];
    const count = newItems.length;

    showToast(
      `📦 Новая поставка: ${first.product}${count > 1 ? ` (+${count - 1})` : ""}`,
      "info",
    );

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("📦 Поставка на склад", {
        body:
          count === 1
            ? `${first.product} — ${first.requester}`
            : `${count} новых позиций ожидают приёмки`,
      });
    }
  }, [orders, isWarehouse, showToast]);

  /* Таймер инвалидации каждые 5 минут (только для склада) */
  useEffect(() => {
    if (!isWarehouse) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }, 300_000);

    return () => clearInterval(interval);
  }, [isWarehouse, queryClient]);
}
