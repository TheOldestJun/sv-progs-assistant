/*
 * Rate limiter — in-memory, по IP-адресу.
 *
 * Алгоритм:
 *   - 5 неудачных попыток подряд → блокировка 1 мин.
 *   - Каждые +5 попыток → время блокировки удваивается (2 мин → 4 мин → 8 мин → ... до 30 мин).
 *   - Счётчик сбрасывается при УСПЕШНОМ входе (recordAttempt(key, true)).
 *   - Когда блокировка истекает, счётчик НЕ сбрасывается автоматически —
 *     следующая неудачная попытка начнёт новый цикл с сохранённым счётчиком.
 *
 * Ограничения:
 *   - In-memory (Map) — не работает при нескольких инстансах Node.js.
 *   - Для multi-server потребуется Redis или БД.
 *   - Потеря данных при перезапуске сервера (приемлемо для внутреннего инструмента).
 *
 * Используется в auth.ts (loginAction) по ключу `login:${ip}`.
 */
const attempts = new Map<string, { count: number; blockedUntil: number }>();

const MAX_FAILS = 5;            // количество неудачных попыток до блокировки
const MAX_BLOCK = 1_800_000;    // максимальная блокировка — 30 мин (в ms)

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;       // сколько попыток осталось до блокировки
  retryAfter?: number;     // секунд до разблокировки (если заблокирован)
}

/** Проверить, не заблокирован ли ключ. Если блокировка истекла — очищает запись. */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = attempts.get(key);

  if (entry && entry.blockedUntil > now) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  if (entry && entry.blockedUntil <= now) {
    attempts.delete(key);
  }

  return { allowed: true, remaining: MAX_FAILS - (entry?.count || 0) };
}

/** Записать попытку. success = true — сброс счётчика. success = false — инкремент. */
export function recordAttempt(key: string, success: boolean): void {
  if (success) {
    attempts.delete(key);
    return;
  }

  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, blockedUntil: now };
  entry.count++;

  if (entry.count >= MAX_FAILS) {
    const excess = entry.count - MAX_FAILS;
    const multiplier = Math.pow(2, Math.floor(excess / MAX_FAILS)); // 1, 2, 4, 8, 16...
    entry.blockedUntil = now + Math.min(60_000 * multiplier, MAX_BLOCK);
  }

  attempts.set(key, entry);
}

/** Очистить все записи. Только для тестов. */
export function _clearAll(): void {
  attempts.clear();
}
