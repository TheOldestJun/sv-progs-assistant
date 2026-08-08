/*
 * /messages — страница сообщений (вариант B)
 * Левая панель: список диалогов + кнопка "Новое сообщение"
 * Правая панель: переписка или форма нового сообщения
 * Данные: общие хуки из hooks/useChat (visibility-aware polling 10s)
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toast";
import {
  useConversations,
  useChatUsers,
  useCurrentUser,
  useChatMessages,
  useSendMessage,
  type UserBrief,
} from "@/hooks/useChat";

/**
 * Парсит текст сообщения и оборачивает ссылки /confirm/... в кликабельные <a>.
 */
function renderMessageText(text: string): React.ReactNode {
  const parts = text.split(/(\/confirm\/[a-f0-9]+)/i);
  return parts.map((part, i) => {
    if (part.startsWith("/confirm/")) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-current opacity-80 hover:opacity-100"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

// ─── Recipient Picker (для нового сообщения) ───
function RecipientPicker({
  users,
  selectedId,
  onSelect,
  onClose,
  error = false,
  onRetry,
}: {
  users: UserBrief[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  error?: boolean;
  onRetry?: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm animate-fade-in overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800 dark:text-gray-100">
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Выберите получателя</h3>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск…"
            autoFocus
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {error ? (
            <div className="p-4 text-center">
              <p className="text-sm text-text-secondary">Не удалось загрузить</p>
              <button
                onClick={onRetry}
                className="mt-2 rounded-md border border-border px-3 py-1 text-xs text-foreground transition-colors hover:bg-surface"
              >
                Повторить
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-text-secondary">Ничего не найдено</p>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => { onSelect(u.id); onClose(); }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface ${
                  u.id === selectedId ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-foreground">{u.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function MessagesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMsgUserId, setNewMsgUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Conversations list (visibility-aware polling 10s)
  const {
    data: conversations = [],
    isLoading: loadingConv,
    isError: convError,
  } = useConversations();

  // Users list для выбора получателя (кэш 5 мин)
  const { data: users = [], isError: usersError } = useChatUsers();

  // Текущий пользователь — надёжный источник myId (вместо выведения из сообщений)
  const { data: currentUser } = useCurrentUser();
  const myId = currentUser?.id ?? null;

  // Messages for selected conversation (visibility-aware polling 10s + auto-read)
  const {
    data: messages = [],
    isLoading: loadingMsgs,
    isError: messagesError,
  } = useChatMessages(selectedUserId);

  // Send message mutation (общий хук)
  const sendMutation = useSendMessage(selectedUserId);

  // Open conversation — выбор диалога просто меняет userId, данные подтянет хук
  const openConversation = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setNewMsgUserId(null);
  }, []);

  // Повторная загрузка по кнопке «Повторить» (invalidation → refetch)
  const retryQuery = useCallback(
    (queryKey: readonly unknown[]) => {
      void queryClient.invalidateQueries({ queryKey });
    },
    [queryClient],
  );

  /*
   * Авто-скролл к последнему сообщению при загрузке или отправке нового.
   * bottomRef — пустой div внизу списка сообщений.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /*
   * Авто-фокус на поле ввода при открытии диалога.
   * setTimeout 100ms даёт React время отрендерить форму до фокуса.
   */
  useEffect(() => {
    if (selectedUserId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedUserId]);

  // Send message (reply)
  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sendMutation.isPending || !selectedUserId) return;
    sendMutation.mutate(text.trim(), {
      onSuccess: () => setText(""),
      onError: (err) =>
        showToast(
          err instanceof Error ? err.message : "Не удалось отправить сообщение",
          "error",
        ),
    });
  }

  // Start new message flow
  function handleNewMessage(userId: string) {
    setNewMsgUserId(userId);
    setSelectedUserId(null);
    // Pre-fill the conversation tab
    openConversation(userId);
    setShowNewMessage(false);
  }

  const selectedUser = selectedUserId
    ? (conversations.find((c) => c.user.id === selectedUserId)?.user
      ?? (messages.length > 0
        ? (messages[0].senderId === myId
          ? messages[0].receiver
          : messages[0].sender)
        : null))
    : null;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-4 overflow-hidden py-4">
        {/* Left panel — conversations (на мобильном видна только пока не выбран диалог) */}
        <div className={`${selectedUserId ? "hidden sm:flex" : "flex"} w-full sm:w-72 sm:shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-surface`}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Диалоги</h2>
            <button
              onClick={() => setShowNewMessage(true)}
              className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
              aria-label="Новое сообщение"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path d="M10 3a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5h-5.5a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 10 3Z" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConv ? (
              <p className="p-4 text-center text-xs text-text-secondary">Загрузка…</p>
            ) : convError ? (
              <div className="p-4 text-center">
                <p className="text-xs text-text-secondary">Не удалось загрузить</p>
                <button
                  onClick={() => retryQuery(["conversations"])}
                  className="mt-2 rounded-md border border-border px-3 py-1 text-xs text-foreground transition-colors hover:bg-surface-secondary"
                >
                  Повторить
                </button>
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-center text-xs text-text-secondary">Нет диалогов</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.user.id}
                  onClick={() => openConversation(c.user.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-secondary ${
                    selectedUserId === c.user.id ? "bg-surface-secondary" : ""
                  }`}
                >
                  <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {c.user.name.charAt(0).toUpperCase()}
                    {c.unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                        {c.unreadCount > 9 ? "9+" : c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {c.user.name}
                    </div>
                    <div className="truncate text-xs text-text-secondary">
                      {c.lastMessage.senderId === c.user.id && "→ "}
                      {c.lastMessage.text}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel — conversation or empty state (на мобильном видна только при выбранном диалоге) */}
        <div className={`${selectedUserId ? "flex" : "hidden sm:flex"} flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface`}>
          {selectedUserId && selectedUser ? (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedUserId(null)}
                    className="flex sm:hidden size-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-secondary"
                    aria-label="Назад к диалогам"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {selectedUser.name}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingMsgs ? (
                  <p className="py-12 text-center text-sm text-text-secondary">Загрузка…</p>
                ) : messagesError ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-text-secondary">Не удалось загрузить</p>
                    <button
                      onClick={() => retryQuery(["messages", selectedUserId])}
                      className="mt-2 rounded-md border border-border px-3 py-1 text-xs text-foreground transition-colors hover:bg-surface-secondary"
                    >
                      Повторить
                    </button>
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-12 text-center text-sm text-text-secondary">
                    Напишите первое сообщение
                  </p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isMine = myId ? msg.senderId === myId : msg.senderId !== selectedUserId;
                      return (
                        <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                              isMine
                                ? "bg-primary text-primary-foreground"
                                : "bg-surface-secondary text-foreground"
                            }`}
                          >
                            <p>{renderMessageText(msg.text)}</p>
                            <p className={`mt-0.5 text-[10px] ${isMine ? "text-primary-foreground/60" : "text-text-secondary"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {isMine && msg.readAt && " ✓"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {/* Reply form */}
              <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ответить…"
                  disabled={sendMutation.isPending}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sendMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {sendMutation.isPending ? "…" : "Отправить"}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mx-auto size-12 text-text-secondary/40">
                  <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h13A1.5 1.5 0 0 1 18 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-6.75l-3.97 3.17A.5.5 0 0 1 5 16.69V14H3.5A1.5 1.5 0 0 1 2 12.5v-9Z" />
                </svg>
                <p className="mt-3 text-sm text-text-secondary">
                  Выберите диалог или создайте новый
                </p>
                <button
                  onClick={() => setShowNewMessage(true)}
                  className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Новое сообщение
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recipient picker modal */}
      {showNewMessage && (
        <RecipientPicker
          users={users.filter((u) => u.id !== myId)}
          selectedId={newMsgUserId ?? ""}
          onSelect={(id) => handleNewMessage(id)}
          onClose={() => setShowNewMessage(false)}
          error={usersError}
          onRetry={() => retryQuery(["users"])}
        />
      )}
    </div>
  );
}
