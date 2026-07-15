/*
 * BackLink — кнопка «← Назад» с useRouter().back().
 * Используется на /help для возврата на предыдущую страницу.
 * "use client" обязателен для доступа к маршрутизатору.
 */
"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function BackLink() {
  const router = useRouter();
  const t = useTranslations("common");
  return (
    <button
      onClick={() => router.back()}
      className="mb-8 flex max-sm:min-h-11 items-center rounded-md px-3 text-left text-sm text-text-secondary transition-colors hover:text-foreground"
    >
      &larr; {t("back")}
    </button>
  );
}
