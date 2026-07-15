/*
 * Страница запросов на сброс пароля (только ADMIN).
 * Показывает PENDING запросы, кнопка для сброса.
 */
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ResetRequestList } from "./ResetRequestList";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "admin.resetRequests" });
  const tAdmin = await getTranslations({ locale: lang, namespace: "admin" });
  return {
    title: `${t("empty")} — ${tAdmin("title")}`,
  };
}

export default async function ResetRequestsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const session = await getSession();
  if (!session || !session.roles.includes("ADMIN")) {
    redirect("/login");
  }

  const t = await getTranslations({ locale: lang, namespace: "admin.resetRequests" });

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
            ? t("empty")
            : t("pending", { count: requests.length })}
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-text-secondary">{t("emptyFull")}</p>
        </div>
      ) : (
        <ResetRequestList requests={requests} />
      )}
    </div>
  );
}
