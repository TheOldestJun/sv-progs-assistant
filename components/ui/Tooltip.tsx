/*
 * Tooltip — всплывающая подсказка при наведении.
 * Использует CSS :hover + absolute positioning.
 * Автоматически подстраивает ширину под контент (max-w-xs).
 */
"use client";

export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  if (!text) return <>{children}</>;

  return (
    <div className="group/tooltip relative inline-flex">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground shadow-lg opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100"
      >
        {text}
      </div>
    </div>
  );
}
