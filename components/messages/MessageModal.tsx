/*
 * MessageModal — модальное окно с двухпанельным макетом диалогов
 * Закрывается по клику вне области модала или Escape
 * Использует TanStack Query (polling 10s)
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";

interface UserBrief {
  id: string;
  name: string;
}

interface LastMessage {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
}

interface Conversation {
  user: UserBrief;
  lastMessage: LastMessage;
  unreadCount: number;
}

interface Message {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
  sender: UserBrief;
  receiver: UserBrief;
  readAt: string | null;
}

// ——— Recipient Picker ———
function RecipientPicker({
  users,
  selectedId,
  onSelect,
  onClose,
  t_messages,
}: {
  users: UserBrief[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  t_messages: (key: string) => string;
}) {
  const [query, setQuery] = useState("");
  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm animate-fade-in overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800 dark:text-gray-100">
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">
            {t_messages("selectRecipient")}
          </h3>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t_messages("search")}
            autoFocus
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-text-secondary">
              {t_messages("empty")}
            </p>
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
                <span className="text-sm font-medium text-foreground">
                  {u.name}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ——— Main Modal ———
export function MessageModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("messages");
  const t_common = useTranslations("common");
  const locale = useLocale();

  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [showNewMessage, setShowNewMessage] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Conversations list (polling 10s)
  const { data: conversations = [], isLoading: loadingConv } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/messages");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    refetchInterval: 10_000,
  });

  // Current user
  const { data: currentUser } = useQuery<UserBrief | null>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Users list (long-lived cache)
  const { data: users = [] } = useQuery<UserBrief[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Messages for selected conversation (polling 10s)
  const {
    data: messages = [],
    isLoading: loadingMsgs,
  } = useQuery<Message[]>({
    queryKey: ["messages", selectedUserId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${selectedUserId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedUserId,
    refetchInterval: 10_000,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: selectedUserId, text: messageText }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Mark as read mutation
  const readMutation = useMutation({
    mutationFn: async (senderId: string) => {
      await fetch("/api/messages/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId }),
      });
    },
  });

  // Mark messages as read when conversation opens
  useEffect(() => {
    if (selectedUserId) {
      readMutation.mutate(selectedUserId);
    }
  }, [selectedUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on conversation open
  useEffect(() => {
    if (selectedUserId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedUserId]);

  // Escape closes modal
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Send message handler
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sendMutation.isPending || !selectedUserId) return;
    sendMutation.mutate(text.trim(), {
      onSuccess: () => setText(""),
    });
  }

  // Open conversation
  const openConversation = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  // Derive selected user name
  const chatUserName = selectedUserId
    ? (conversations.find((c) => c.user.id === selectedUserId)?.user.name ??
       users.find((u) => u.id === selectedUserId)?.name ??
       t_common("loading"))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal body */}
      <div
        ref={modalRef}
        className="relative z-10 flex h-[80vh] max-h-[calc(100vh-2rem)] w-full max-w-4xl animate-fade-in flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800 dark:text-gray-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {t("title")}
          </h2>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface hover:text-foreground"
            aria-label={t("close")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Two-panel content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — conversations */}
          <div className="flex w-64 shrink-0 flex-col border-r border-border max-sm:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {t("dialogs")}
              </span>
              <button
                onClick={() => setShowNewMessage(true)}
                className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
                aria-label={t("newMessage")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                  <path d="M10 3a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5h-5.5a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 10 3Z" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingConv ? (
                <p className="p-4 text-center text-xs text-text-secondary">{t_common("loading")}</p>
              ) : conversations.length === 0 ? (
                <p className="p-4 text-center text-xs text-text-secondary">{t("empty")}</p>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.user.id}
                    onClick={() => openConversation(c.user.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface ${
                      selectedUserId === c.user.id ? "bg-surface" : ""
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

          {/* Right panel — conversation or empty */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {selectedUserId ? (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b border-border px-5 py-3">
                  <button
                    onClick={() => setSelectedUserId(null)}
                    className="flex size-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface hover:text-foreground sm:hidden"
                    aria-label={t("backToList")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {chatUserName?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {chatUserName}
                  </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                  {loadingMsgs ? (
                    <p className="py-12 text-center text-sm text-text-secondary">{t_common("loading")}</p>
                  ) : messages.length === 0 ? (
                    <p className="py-12 text-center text-sm text-text-secondary">
                      {t("writeFirst")}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => {
                        const isMine = msg.senderId !== selectedUserId;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                                isMine
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-surface text-foreground"
                              }`}
                            >
                              <p>{msg.text}</p>
                              <p className={`mt-0.5 text-[10px] ${isMine ? "text-primary-foreground/60" : "text-text-secondary"}`}>
                                {new Date(msg.createdAt).toLocaleTimeString(locale, {
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

                {/* Reply */}
                <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t("reply")}
                    disabled={sendMutation.isPending}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!text.trim() || sendMutation.isPending}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
                  >
                    {sendMutation.isPending ? "…" : t("send")}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
                <div className="sm:hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      {t("dialogs")}
                    </span>
                    <button
                      onClick={() => setShowNewMessage(true)}
                      className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
                      aria-label={t("newMessage")}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                        <path d="M10 3a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5h-5.5a.75.75 0 0 1 0-1.5h5.5v-5.5A.75.75 0 0 1 10 3Z" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-3 space-y-1">
                    {loadingConv ? (
                      <p className="text-center text-xs text-text-secondary">{t_common("loading")}</p>
                    ) : conversations.length === 0 ? (
                      <p className="text-center text-xs text-text-secondary">{t("empty")}</p>
                    ) : (
                      conversations.map((c) => (
                        <button
                          key={c.user.id}
                          onClick={() => openConversation(c.user.id)}
                          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-surface"
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
                <div className="hidden sm:flex sm:flex-col sm:items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-12 text-text-secondary/40">
                    <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h13A1.5 1.5 0 0 1 18 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-6.75l-3.97 3.17A.5.5 0 0 1 5 16.69V14H3.5A1.5 1.5 0 0 1 2 12.5v-9Z" />
                  </svg>
                  <p className="mt-3 text-sm text-text-secondary">
                    {t("selectDialog")}
                  </p>
                  <button
                    onClick={() => setShowNewMessage(true)}
                    className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                  >
                    {t("newMessage")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recipient picker */}
      {showNewMessage && (
        <RecipientPicker
          users={users.filter((u) => u.id !== currentUser?.id)}
          selectedId=""
          onSelect={(id) => {
            openConversation(id);
            setShowNewMessage(false);
          }}
          onClose={() => setShowNewMessage(false)}
          t_messages={t}
        />
      )}
    </div>
  );
}
