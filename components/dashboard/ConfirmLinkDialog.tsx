/*
 * ConfirmLinkDialog — диалог копирования ссылки публичного подтверждения
 * для отправки заявителю.
 */
"use client";

import { useToast } from "@/components/ui/Toast";

interface ConfirmLinkDialogProps {
  token: string;
  onClose: () => void;
}

export function ConfirmLinkDialog({ token, onClose }: ConfirmLinkDialogProps) {
  const { showToast } = useToast();

  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/confirm/${token}`;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-lg">
          <h3 className="text-base font-semibold text-foreground">
            Ссылка для подтверждения
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Отправьте эту ссылку заявителю для подтверждения получения
          </p>
          <div className="mt-4 flex items-center gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 rounded-lg border border-border bg-surface-secondary px-3 py-2 text-sm text-foreground"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(link);
                showToast("Ссылка скопирована", "success");
              }}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Копировать
            </button>
          </div>
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-secondary"
          >
            Закрыть
          </button>
        </div>
      </div>
    </>
  );
}
