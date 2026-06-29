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
