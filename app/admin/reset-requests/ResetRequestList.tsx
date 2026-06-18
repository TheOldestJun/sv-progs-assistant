/*
 * Клиентский компонент списка запросов на сброс пароля.
 * Кнопка "Сбросить" → server action → toast → refresh.
 */
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { resetUserPasswordAction } from "@/app/lib/auth";
import { useToast } from "@/app/components/ui/Toast";

interface ResetRequest {
  id: string;
  createdAt: Date;
  user: { id: string; name: string; email: string };
}

export function ResetRequestList({ requests }: { requests: ResetRequest[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleReset(requestId: string) {
    startTransition(async () => {
      const result = await resetUserPasswordAction(requestId);
      if ("error" in result) {
        showToast(result.error, "error");
      } else {
        showToast(result.message, "success");
        router.refresh();
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-secondary">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">Пользователь</th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">Email</th>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">Запрошен</th>
            <th className="px-4 py-3 text-right font-medium text-text-secondary">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-surface">
              <td className="px-4 py-3 font-medium text-foreground">{req.user.name}</td>
              <td className="px-4 py-3 text-text-secondary">{req.user.email}</td>
              <td className="px-4 py-3 text-text-secondary">
                {new Date(req.createdAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleReset(req.id)}
                  disabled={isPending}
                  className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {isPending ? "Сброс..." : "Сбросить пароль"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
