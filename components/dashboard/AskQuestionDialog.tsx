"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface AskQuestionDialogProps {
  open: boolean;
  productTitle: string;
  quantity: number;
  unitTitle: string;
  requesterUserId: string;
  orderDate: string;
  onClose: () => void;
}

export function AskQuestionDialog({
  open,
  productTitle,
  quantity,
  unitTitle,
  requesterUserId,
  orderDate,
  onClose,
}: AskQuestionDialogProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();

  if (!open) return null;

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: requesterUserId,
          text: `Вопрос по заявке от ${orderDate}, позиция «${productTitle}» (${quantity} ${unitTitle}): ${trimmed}`,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка отправки");
      }
      showToast("Вопрос отправлен заявителю", "success");
      setText("");
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Ошибка отправки", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md animate-fade-in overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800 dark:text-gray-100">
        <div className="p-6">
          <h2 className="text-base font-semibold text-foreground">
            Задать вопрос по позиции
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {productTitle} — {quantity} {unitTitle}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Заявка от {orderDate}
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Опишите вопрос..."
            rows={4}
            className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-border bg-surface-secondary px-6 py-4">
          <button
            onClick={onClose}
            disabled={sending}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? "Отправка..." : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}
