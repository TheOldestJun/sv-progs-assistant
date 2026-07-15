/*
 * Админ-панель: архив заявок (только ADMIN, возможность удалять из архива)
 */
import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/auth";
import { AdminArchiveList } from "./AdminArchiveList";

export const dynamic = "force-dynamic";

export default async function AdminArchivePage() {
  const session = await getSession();
  if (!session || !session.roles.includes("ADMIN")) {
    redirect("/dashboard");
  }

  return <AdminArchiveList />;
}
