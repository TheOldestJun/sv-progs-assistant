/*
 * BackLink — кнопка «← Назад» с useRouter().back().
 * Используется на /help для возврата на предыдущую страницу.
 * "use client" обязателен для доступа к маршрутизатору.
 */
"use client";

import { useRouter } from "next/navigation";

export function BackLink() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="mb-8 py-2 text-left text-sm text-text-secondary transition-colors hover:text-foreground"
    >
      &larr; Назад
    </button>
  );
}
