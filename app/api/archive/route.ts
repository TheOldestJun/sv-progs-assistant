/*
 * GET /api/archive — архив удалённых заявок.
 * Автоматически удаляет записи старше 3 лет.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const requester = searchParams.get("requester")?.trim();
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    // Очищаем записи старше 3 лет
    await db.archivedOrder.deleteMany({
      where: { receivedAt: { lt: threeYearsAgo } },
    });

    type WhereInput = {
      requesterName?: { contains: string };
      orderDate?: { gte?: Date; lte?: Date };
      createdById?: string;
    };

    const conditions: WhereInput = {};

    // REQUESTER-only видят только свои архивные заявки
    const isRequesterOnly = session.roles.length === 1 && session.roles.includes("REQUESTER");
    if (isRequesterOnly) {
      conditions.createdById = session.id;
    }

    if (requester) {
      conditions.requesterName = { contains: requester };
    }
    if (dateFrom || dateTo) {
      const orderDate: { gte?: Date; lte?: Date } = {};
      if (dateFrom) {
        const [y, m, d] = dateFrom.split("-").map(Number);
        orderDate.gte = new Date(y, m - 1, d);
      }
      if (dateTo) {
        const [y, m, d] = dateTo.split("-").map(Number);
        orderDate.lte = new Date(y, m - 1, d, 23, 59, 59, 999);
      }
      conditions.orderDate = orderDate;
    }

    const archives = await db.archivedOrder.findMany({
      where: conditions,
      orderBy: { archivedAt: "desc" },
    });

    return NextResponse.json(archives);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
