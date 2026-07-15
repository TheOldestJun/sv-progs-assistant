/*
 * Админ-панель: список пользователей с возможностью создания,
 * редактирования и удаления.
 */
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { getTranslations } from "next-intl/server";
import { AdminUserList } from "./UserList";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "admin" });
  return {
    title: `${t("title")} — SV Progs Assistant`,
  };
}

export default async function AdminPage() {
  const session = await getSession();
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      roles: { select: { role: true } },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const safeUsers = users.map(({ roles, ...u }) => ({
    ...u,
    roles: roles.map((r) => r.role),
  }));

  const pendingResetCount = await db.passwordResetRequest.count({
    where: { status: "PENDING" },
  });

  return (
    <AdminUserList
      users={safeUsers}
      currentUserId={session?.id ?? ""}
      pendingResetCount={pendingResetCount}
    />
  );
}
