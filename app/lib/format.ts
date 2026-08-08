/*
 * format.ts — клиент/сервер-безопасные утилиты форматирования.
 * ВАЖНО: без рантайм-зависимостей (модуль используется и в клиентских компонентах).
 *
 * getLocalDateISO() — локальная дата YYYY-MM-DD (НЕ UTC). toISOString() отдаёт
 * UTC, из-за чего в часовых поясах восточнее UTC в 00:00–02:59 «сегодня»
 * превращается во «вчера» — это была системная ошибка дат по умолчанию.
 */

/** Текущая локальная дата в формате YYYY-MM-DD (по компонентам, а не по UTC). */
export function getLocalDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Русская плюрализация: pluralRu(21, ["заявка", "заявки", "заявок"]) → "заявка".
 * Правила: 1 заявка / 2-4 заявки / 5-20 заявок (с исключениями 11-14).
 */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
  return forms[2];
}
