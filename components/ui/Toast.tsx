/*
 * Toast-уведомления через контекст.
 * ToastProvider — обёртка в root layout.
 * useToast() — хук для показа уведомлений из любой точки приложения.
 */
"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  dismissable?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, dismissable?: boolean) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;

const CheckIcon = () => (
  // Галочка — для success-уведомлений
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-5 shrink-0"
  >
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
      clipRule="evenodd"
    />
  </svg>
);

const InfoIcon = () => (
  // Круг с i — для info-уведомлений
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-5 shrink-0"
  >
    <path
      fillRule="evenodd"
      d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
      clipRule="evenodd"
    />
  </svg>
);

const XIcon = () => (
  // Круг с крестиком — для error-уведомлений
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="size-5 shrink-0"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
      clipRule="evenodd"
    />
  </svg>
);

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", dismissable?: boolean) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type, dismissable }]);
      if (!dismissable) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
      }
    },
    []
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}

      {toasts.length > 0 && (
        <div className="fixed left-1/2 top-4 z-50 flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`animate-slide-down flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-medium shadow-lg ${
                t.type === "success"
                  ? "bg-green-600 text-white"
                  : t.type === "info"
                    ? "bg-blue-600 text-white"
                    : "bg-red-600 text-white"
              }`}
            >
              {t.type === "success" ? <CheckIcon /> : t.type === "info" ? <InfoIcon /> : <XIcon />}
              <span className="flex-1">{t.message}</span>
              {t.dismissable && (
                <button
                  onClick={() => dismissToast(t.id)}
                  className="ml-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs transition-colors hover:bg-white/30"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
