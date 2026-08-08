/*
 * Страница /confirm/:token — публичное подтверждение получения конкретной позиции заявки.
 * Не требует авторизации. Заявитель нажимает кнопку «Я получил»,
 * и позиция переводится в статус ORDER_CONFIRMED.
 */
"use client";

import { use, useEffect, useState } from "react";

interface ConfirmData {
  used: boolean;
  order: {
    id: string;
    requester: string;
    created: string;
  } | null;
  item: {
    id: string;
    product: string;
    unit: string;
    quantity: number;
    status: string;
  } | null;
}

export default function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <ConfirmClient token={token} />;
}

function ConfirmClient({ token }: { token: string }) {
  const [data, setData] = useState<ConfirmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    fetch(`/api/confirm/${token}`)
      .then(async (res) => {
        const json = await res.json();
        return json;
      })
      .then((d: ConfirmData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Ошибка загрузки");
        setLoading(false);
      });
  }, [token]);

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/confirm/${token}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Ошибка подтверждения");
      }
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface-secondary p-8 text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <h1 className="text-lg font-semibold text-foreground">Ошибка</h1>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const orderExists = !!data.order;
  const item = data.item;
  // used=true — токен уже был использован ранее; item.status — позиция могла
  // получить ORDER_CONFIRMED другим путём (например, со склада). В обоих
  // случаях показываем нейтральное «Уже подтверждено», а не зелёный «успех».
  const tokenUsed = data.used || item?.status === "ORDER_CONFIRMED";

  // Токен валиден, но заявка/позиция исчезла — это ошибка, а не успех.
  if (!orderExists) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface-secondary p-8 text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <h1 className="text-lg font-semibold text-foreground">Заявка не найдена</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Заявка была удалена или ссылка устарела. Обратитесь к снабжению для уточнения.
          </p>
        </div>
      </div>
    );
  }

  if (tokenUsed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface-secondary p-8 text-center">
          <div className="mb-4 text-4xl">ℹ️</div>
          <h1 className="text-lg font-semibold text-foreground">Уже подтверждено</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Это получение уже было подтверждено ранее. Ничего делать не нужно.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface-secondary p-8">
        <div className="mb-6 text-center">
          <div className="mb-3 text-4xl">
            {confirmed ? "✅" : "📦"}
          </div>
          <h1 className="text-lg font-semibold text-foreground">
            {confirmed ? "Получение подтверждено" : "Подтверждение получения"}
          </h1>
          {orderExists && (
            <p className="mt-1 text-sm text-text-secondary">
              Заявка от {new Date(data.order!.created).toLocaleDateString("ru-RU")} · {data.order!.requester}
            </p>
          )}
        </div>

        {/* Позиция */}
        {item && (
          <div className="mb-6 rounded-lg border border-border bg-surface px-4 py-3">
            <p className="text-sm font-medium text-foreground">{item.product}</p>
            <p className="mt-1 text-xs text-text-secondary">
              {item.quantity} {item.unit}
            </p>
          </div>
        )}

        {/* Кнопка подтверждения. Сюда попадаем только если токен свежий,
            заявка существует и позиция ещё не подтверждена (см. early-return выше). */}
        {!confirmed ? (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {confirming ? "Подтверждение..." : "Я получил"}
          </button>
        ) : (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
            Получение подтверждено
          </div>
        )}
      </div>
    </div>
  );
}
