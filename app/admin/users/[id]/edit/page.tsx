/*
 * Страница редактирования пользователя (только ADMIN).
 * Загружает данные пользователя на сервере, форма — клиентский компонент.
 */
import { notFound } from "next/navigation";
import { db } from "@/app/lib/db";
import { EditUserForm } from "./EditUserForm";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      roles: { select: { role: true } },
    },
  });

  if (!user) notFound();

  return (
    <EditUserForm
      user={{
        ...user,
        roles: user.roles.map((r) => r.role),
      }}
    />
  );
}
