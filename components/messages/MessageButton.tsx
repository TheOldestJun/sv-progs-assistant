/*
 * MessageButton — иконка сообщений в хедере с бейджем непрочитанных
 * Опрашивает /api/messages/unread-count каждые 10 секунд
 * Открывает MessageModal по клику
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MessageModal } from "./MessageModal";

export function MessageButton() {
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnread(data.count);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 10_000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  if (loading) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex max-sm:min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
        aria-label="Сообщения"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-6">
          <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h13A1.5 1.5 0 0 1 18 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-6.75l-3.97 3.17A.5.5 0 0 1 5 16.69V14H3.5A1.5 1.5 0 0 1 2 12.5v-9Z" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && createPortal(<MessageModal onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
