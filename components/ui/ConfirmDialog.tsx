/*
 * Красивый диалог подтверждения через контекст.
 * ConfirmProvider — обёртка в root layout.
 * useConfirmDialog() — хук, возвращает { confirm } — асинхронную функцию,
 *   которая возвращает boolean (true = подтверждено, false = отменено).
 *
 * Использование:
 *   const { confirm } = useConfirmDialog();
 *   if (await confirm({ title: "...", message: "..." })) { ... }
 */
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

type ConfirmVariant = "danger" | "default";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

function WarningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="size-5 shrink-0"
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ConfirmProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Required<ConfirmOptions>>({
    title: "",
    message: "",
    confirmText: "Подтвердить",
    cancelText: "Отмена",
    variant: "default",
  });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions({
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || "Подтвердить",
      cancelText: opts.cancelText || "Отмена",
      variant: opts.variant || "default",
    });
    setOpen(true);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") handleCancel();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, handleCancel]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCancel}
          />

          <div
            ref={dialogRef}
            className="relative z-10 w-full max-w-md animate-fade-in overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800 dark:text-gray-100"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    options.variant === "danger"
                      ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                      : "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                  }`}
                >
                  <WarningIcon />
                </span>

                <div className="min-w-0 flex-1">
                  <h2
                    id="confirm-title"
                    className="text-base font-semibold text-foreground"
                  >
                    {options.title}
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    {options.message}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border bg-surface-secondary px-6 py-4">
              <button
                onClick={handleCancel}
                className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary"
              >
                {options.cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-white transition-colors ${
                  options.variant === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirmDialog must be used within ConfirmProvider");
  return ctx;
}
