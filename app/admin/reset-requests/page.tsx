/*
 * Страница запросов на сброс пароля (только ADMIN).
 * Показывает PENDING запросы, кнопка для сброса.
 */
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import { ResetRequestList } from "./ResetRequestList";

export const metadata = {
  title: "Запросы сброса — Админ-панель",
};

export default async function ResetRequestsPage() {
  const session = await getSession();
  if (!session || !session.roles.includes("ADMIN")) {
    redirect("/login");
  }

  const requests = await db.passwordResetRequest.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-text-secondary">
          {requests.length === 0
            ? "Нет ожидающих запросов"
            : `Ожидающих запросов: ${requests.length}`}
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-text-secondary">Нет запросов на сброс пароля</p>
        </div>
      ) : (
        <ResetRequestList requests={requests} />
      )}
    </div>
  );
}
