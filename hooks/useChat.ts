/*
 * useChat.ts — общие клиентские хуки для чата (модалка + /messages).
 * Обеспечивают одинаковую логику: visibility-aware polling (пауза в скрытой
 * вкладке + мгновенный refetch при возврате), пометку прочитанным, отправку.
 *
 * Единый источник данных:
 * - useChatVisibility()  — интервал опроса + refetch при возврате вкладки
 * - useConversations()   — GET /api/messages  (список диалогов, polling 10s)
 * - useChatUsers()       — GET /api/users     (для выбора получателя, 5 мин)
 * - useCurrentUser()     — GET /api/auth/me   (надёжный источник myId, 5 мин)
 * - useChatMessages(id)  — GET /api/messages/:id (переписка, polling 10s) + read
 * - useSendMessage(id)   — POST /api/messages (отправка + invalidation)
 */
"use client";

import { useCallback, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

// ——— Типы, совпадающие с ответами API чата ———
export interface UserBrief {
  id: string;
  name: string;
}

export interface LastMessage {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
}

export interface Conversation {
  user: UserBrief;
  lastMessage: LastMessage;
  unreadCount: number;
}

export interface Message {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
  sender: UserBrief;
  receiver: UserBrief;
  readAt: string | null;
}

// Интервал опроса и время жизни кэша
const POLL_INTERVAL_MS = 10_000;
const LONG_STALE_MS = 5 * 60 * 1000;

/**
 * Visibility-aware опрос для TanStack Query v5.
 * - Возвращает функцию refetchInterval: пока вкладка скрыта → false (опрос встаёт),
 *   при возврате → 10 000 мс.
 * - Дополнительно вешает слушатель visibilitychange: при возврате вкладки
 *   мгновенно refetch-ит все активные запросы (чтобы данные были свежими сразу).
 * Используется во всех чат-хуках и в кнопке-бейдже непрочитанных.
 */
// Возвращаем колбэк без параметров: (query) => ... из TanStack v5 инвариантен
// по generic, поэтому подставлять его напрямую нельзя — а функция без
// аргументов совместима с любым вариантом refetchInterval.
export function useChatVisibility(): () => number | false {
  const queryClient = useQueryClient();

  // Мгновенный refetch активных запросов при возврате вкладки на передний план
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void queryClient.refetchQueries({ type: "active" });
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [queryClient]);

  // refetchInterval-колбэк: пауза, пока вкладка скрыта.
  // ВАЖНО: TanStack v5 вызывает refetchInterval уже при создании наблюдателя,
  // в т.ч. во время SSR — поэтому нужна проверка typeof document !== "undefined".
  return useCallback(
    () =>
      typeof document !== "undefined" &&
      document.visibilityState === "visible"
        ? POLL_INTERVAL_MS
        : false,
    [],
  );
}

/**
 * Список диалогов: GET /api/messages, visibility-aware polling 10s.
 */
export function useConversations() {
  const refetchInterval = useChatVisibility();
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/messages");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    refetchInterval,
  });
}

/**
 * Список всех пользователей (для выбора получателя): GET /api/users.
 * Кэшируется на 5 минут — пользователи меняются редко.
 */
export function useChatUsers() {
  return useQuery<UserBrief[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    staleTime: LONG_STALE_MS,
  });
}

/**
 * Текущий пользователь: GET /api/auth/me.
 * Надёжный источник myId (вместо выведения из первого сообщения).
 */
export function useCurrentUser() {
  return useQuery<UserBrief | null>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: LONG_STALE_MS,
  });
}

/**
 * Переписка с конкретным пользователем: GET /api/messages/:userId.
 * - Запрос активен только когда userId задан (enabled).
 * - Visibility-aware polling 10s.
 * - Пока данные грузятся/обновляются, автоматически помечает сообщения
 *   прочитанными (PATCH /api/messages/read) и обновляет бейдж непрочитанных.
 */
export function useChatMessages(userId: string | null) {
  const queryClient = useQueryClient();
  const refetchInterval = useChatVisibility();

  // Пометка сообщений от собеседника прочитанными
  const readMutation = useMutation({
    mutationFn: async (senderId: string) => {
      const res = await fetch("/api/messages/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId }),
      });
      if (!res.ok) throw new Error("Failed to mark as read");
    },
    onSuccess: () => {
      // После прочтения сразу обновляем бейдж непрочитанных в шапке
      void queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const query = useQuery<Message[]>({
    queryKey: ["messages", userId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!userId,
    refetchInterval,
  });

  // При открытии диалога и при обновлении данных (новые входящие)
  // помечаем сообщения прочитанными, если они ещё не прочитаны.
  useEffect(() => {
    if (!userId) return;
    const hasUnread = query.data?.some(
      (m) => m.senderId === userId && !m.readAt,
    );
    if (hasUnread) {
      readMutation.mutate(userId);
    }
  }, [userId, query.data]);

  return query;
}

/**
 * Отправка сообщения: POST /api/messages { receiverId, text }.
 * - receiverId фиксируется при вызове хука (выбранный диалог).
 * - mutate(text, { onSuccess, onError }) — как в исходном коде.
 * - onSuccess: invalidation сообщений диалога и списка диалогов.
 */
export function useSendMessage(receiverId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      if (!receiverId) throw new Error("Получатель не выбран");
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, text }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      // Обновляем переписку и список диалогов (последнее сообщение, unread)
      void queryClient.invalidateQueries({ queryKey: ["messages", receiverId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
