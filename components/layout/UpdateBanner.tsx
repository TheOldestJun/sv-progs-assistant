/*
 * UpdateBanner — баннер «Вышла новая версия» для всех пользователей.
 * Как работает:
 * - Собирается с SHA билда, вшитым в бандл (NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA).
 * - Периодически (каждые 60с) опрашивает /api/version и сравнивает версии.
 * - Если версии различаются — новый деплой в проде: показываем баннер и
 *   через 15 секунд принудительно перезагружаем страницу, чтобы пользователь
 *   получил свежий JS/CSS вместо устаревшего из кэша.
 * - Если пользователь сам нажмёт «Обновить сейчас» — перезагрузка мгновенная.
 * В dev-режиме (без Vercel-переменных) обе версии совпадают, баннер не показывается.
 */
"use client";

import { useEffect, useRef, useState } from "react";

// Версия билда, вшитая в клиентский бандл при сборке
const BUILD_VERSION = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "";
// Интервал опроса нового деплоя
const POLL_INTERVAL_MS = 60_000;
// Через сколько секунд принудительно перезагружаем страницу
const FORCE_RELOAD_AFTER_S = 15;

export function UpdateBanner() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(FORCE_RELOAD_AFTER_S);
  // lastFetchedVersion: чтобы не спамить fetch при каждом рендере
  const checkedRef = useRef(false);

  useEffect(() => {
    // Если Vercel-переменных нет (dev / локальный запуск) — детекция не нужна
    if (!BUILD_VERSION) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;

    const checkVersion = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data: { version?: string } = await res.json();
        if (data.version && data.version !== BUILD_VERSION) {
          setHasUpdate(true);
        }
      } catch {
        // Ошибка сети/сервера — просто пропускаем раунд
      }
    };

    if (!checkedRef.current) {
      checkedRef.current = true;
      void checkVersion();
      intervalId = setInterval(checkVersion, POLL_INTERVAL_MS);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Обратный отсчёт до принудительной перезагрузки
  useEffect(() => {
    if (!hasUpdate) return;
    if (secondsLeft <= 0) {
      window.location.reload();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [hasUpdate, secondsLeft]);

  if (!hasUpdate) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6"
    >
      <div className="animate-slide-down mx-auto flex max-w-3xl flex-col items-start gap-3 rounded-lg border border-accent/30 bg-surface shadow-xl sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <div className="flex items-start gap-3 sm:items-center">
          {/* Иконка обновления */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-6 shrink-0 text-accent"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold">Вышла новая версия приложения</p>
            <p className="text-xs text-text-secondary">
              Страница обновится автоматически через {secondsLeft} с.
            </p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="ml-auto rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Обновить сейчас
        </button>
      </div>
    </div>
  );
}
