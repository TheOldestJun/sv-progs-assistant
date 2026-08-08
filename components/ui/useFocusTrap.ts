/*
 * useFocusTrap — хук доступности для модальных окон (UI-аудит L2):
 * - при открытии сохраняет предыдущий элемент с фокусом и фокусирует первый
 *   фокусируемый элемент внутри диалога (или сам диалог);
 * - ловит Tab/Shift+Tab внутри диалога (фокус не уходит на фон);
 * - закрывает по Escape;
 * - при закрытии возвращает фокус на прежний элемент.
 *
 * Использование:
 *   const dialogRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(open, dialogRef, onClose);
 *
 * ВАЖНО: onClose берётся через ref, чтобы стабильная ссылка не перезапускала
 * эффект на каждый ре-рендер родителя (иначе фокус сбрасывался бы на 1-й элемент).
 */
"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    // Алиас без union: TS не переносит сужение свойств (ref.current) внутрь замыканий
    const dialog: HTMLElement = el;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Начальный фокус: первый фокусируемый элемент внутри диалога (или сам диалог)
    const firstFocusable = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? dialog).focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((f) => !f.hasAttribute("disabled"));

      if (focusables.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        if (active === firstEl || !dialog.contains(active)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else if (active === lastEl || !dialog.contains(active)) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      // Возврат фокуса на элемент, с которого открыли диалог
      previouslyFocused?.focus?.();
    };
  }, [open, ref]);
}
