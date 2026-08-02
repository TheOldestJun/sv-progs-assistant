/*
 * Единый обработчик исключений для API-роутов.
 *
 * Логирует ошибку на сервере (для диагностики по console), а клиенту возвращает
 * generic-сообщение — НЕ раскрывает internals: SQL-строки, пути, стектрейсы,
 * конфиденциальные данные. Найдено аудитом безопасности (H1: утечка error.message).
 */
import { NextResponse } from "next/server";

export function handleApiError(error: unknown, context = "API"): NextResponse {
  console.error(`[${context}]`, error);
  return NextResponse.json(
    { error: "Внутренняя ошибка сервера" },
    { status: 500 },
  );
}
