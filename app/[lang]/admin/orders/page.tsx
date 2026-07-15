/*
 * Админ-панель: управление заявками (только ADMIN)
 */
import { redirect } from "next/navigation";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { AdminOrderList } from "./AdminOrderList";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const session = await getSession();
  if (!session || !session.roles.includes("ADMIN")) {
    redirect("/dashboard");
  }

  const orders = await db.order.findMany({
    orderBy: { created: "desc" },
    select: {
      id: true,
      created: true,
      requester: { select: { name: true } },
      createdBy: { select: { name: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          comment: true,
          status: true,
          product: { select: { title: true } },
          units: { select: { title: true } },
        },
      },
    },
  });

  const safe = orders.map((o) => ({
    ...o,
    created: o.created.toISOString(),
  }));

  return <AdminOrderList orders={safe} />;
}
