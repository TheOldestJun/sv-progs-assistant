/*
 * Клиентский компонент списка пользователей с кнопками удаления.
 * После удаления показывает toast и обновляет список.
 */
"use client";

import { useRouter } from "next/navigation";
import { useTransition, useEffect, useRef, useState } from "react";
import { deleteUserAction } from "../lib/auth";
import { useToast } from "@/components/ui/Toast";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

const PAGE_SIZE = 10;

interface SafeUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

const roleLabels: Record<string, string> = {
  ADMIN: "Администратор",
  HEAD_OF_SUPPLY: "Начальник снабжения",
  SUPPLY_DEPT: "Отдел снабжения",
  WAREHOUSE: "Склад",
  REQUESTER: "Заявитель",
};

const roleColors: Record<string, { bg: string; text: string; ring: string }> = {
  ADMIN:        { bg: "bg-rose-50 dark:bg-rose-950",     text: "text-rose-700 dark:text-rose-300",     ring: "ring-rose-600/20" },
  HEAD_OF_SUPPLY: { bg: "bg-violet-50 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-300", ring: "ring-violet-600/20" },
  SUPPLY_DEPT:  { bg: "bg-blue-50 dark:bg-blue-950",    text: "text-blue-700 dark:text-blue-300",     ring: "ring-blue-600/20" },
  WAREHOUSE:    { bg: "bg-amber-50 dark:bg-amber-950",  text: "text-amber-700 dark:text-amber-300",   ring: "ring-amber-600/20" },
  REQUESTER:    { bg: "bg-teal-50 dark:bg-teal-950",   text: "text-teal-700 dark:text-teal-300",     ring: "ring-teal-600/20" },
};

export function AdminUserList({
  users,
  currentUserId,
  pendingResetCount = 0,
}: {
  users: SafeUser[];
  currentUserId: string;
  pendingResetCount?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();
  const hasShownToast = useRef(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (pendingResetCount > 0 && !hasShownToast.current) {
      hasShownToast.current = true;
      const word = pendingResetCount === 1 ? "запрос" : "запроса";
      showToast(`${pendingResetCount} ${word} на сброс пароля`, "info");
    }
  }, [pendingResetCount, showToast]);

  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const safePage = Math.min(page, totalPages - 1);
  const pagedUsers = users.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Удаление пользователя",
      message: "Вы уверены, что хотите удалить пользователя? Это действие нельзя отменить.",
      confirmText: "Удалить",
      cancelText: "Отмена",
      variant: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteUserAction(id);
      if ("error" in result) {
        showToast(result.error, "error");
      } else {
        showToast(result.message, "success");
        router.refresh();
      }
    });
  }

  return (
    <div>
      {pendingResetCount > 0 && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <span className="font-medium">Внимание!</span> Есть{" "}
          <a
            href="/admin/reset-requests"
            className="font-medium underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-200"
          >
            {pendingResetCount} ожидающих запрос{pendingResetCount === 1 ? "" : "а"} на сброс
            пароля
          </a>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Всего пользователей: {users.length}
        </p>
        <a
          href="/admin/users/new"
          className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover max-sm:min-h-11"
        >
          + Создать пользователя
        </a>
      </div>

      {users.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-text-secondary">Нет пользователей</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary max-sm:hidden">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  Имя
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  Роли
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  Создан
                </th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-surface max-sm:flex max-sm:flex-col max-sm:border-b max-sm:border-border max-sm:px-4 max-sm:py-3 max-sm:gap-2">
                  <td className="px-4 py-3 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-2 max-sm:p-0">
                    <span className="sm:hidden text-xs font-medium text-text-secondary">Имя</span>
                    <span className="font-medium text-foreground">{user.name}</span>
                  </td>
                  <td className="px-4 py-3 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-2 max-sm:p-0">
                    <span className="sm:hidden text-xs font-medium text-text-secondary">Email</span>
                    <span className="text-text-secondary">{user.email}</span>
                  </td>
                  <td className="px-4 py-3 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-2 max-sm:p-0">
                    <span className="sm:hidden text-xs font-medium text-text-secondary">Роли</span>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.includes("ADMIN")
                        ? (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950 dark:text-rose-300">
                            {roleLabels.ADMIN}
                          </span>
                        )
                        : user.roles.map((role) => (
                          <span
                            key={role}
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${roleColors[role]?.bg || "bg-surface-secondary"} ${roleColors[role]?.text || "text-foreground"} ${roleColors[role]?.ring || "ring-border"}`}
                          >
                            {roleLabels[role] || role}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-2 max-sm:p-0">
                    <span className="sm:hidden text-xs font-medium text-text-secondary">Создан</span>
                    <span className="text-text-secondary">{new Date(user.createdAt).toLocaleDateString("ru-RU")}</span>
                  </td>
                  <td className="px-4 py-3 text-right max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-2 max-sm:p-0 max-sm:pt-2">
                    <span className="sm:hidden text-xs font-medium text-text-secondary">Действия</span>
                    <div className="flex items-center justify-end gap-3">
                      <a
                        href={`/admin/users/${user.id}/edit`}
                        className="inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-accent transition-colors hover:text-accent-hover sm:min-h-0 sm:px-0 sm:py-0"
                      >
                        Редактировать
                      </a>
                      {user.id !== currentUserId && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={isPending}
                          className="inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-red-500 transition-colors hover:text-red-600 disabled:opacity-50 sm:min-h-0 sm:px-0 sm:py-0"
                        >
                          {isPending ? "Удаление..." : "Удалить"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
          <span>
            {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, users.length)} из {users.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-md px-3 py-1.5 transition-colors hover:bg-surface-secondary disabled:opacity-30 max-sm:min-h-11"
            >
              ← Назад
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`rounded-md px-3 py-1.5 transition-colors max-sm:min-h-11 ${
                  i === safePage
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-surface-secondary"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage === totalPages - 1}
              className="rounded-md px-3 py-1.5 transition-colors hover:bg-surface-secondary disabled:opacity-30 max-sm:min-h-11"
            >
              Вперед →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
