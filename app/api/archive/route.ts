/*
 * GET /api/archive — архив удалённых заявок с пагинацией.
 * Фильтр: requester (startsWith — использует индекс), dateFrom, dateTo.
 * Автоматически удаляет записи старше 3 лет при каждом запросе.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Автоматическая очистка записей старше 3 лет
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    await db.archivedOrder.deleteMany({
      where: { archivedAt: { lt: threeYearsAgo } },
    });
    const { searchParams } = new URL(request.url);
    const requester = searchParams.get("requester")?.trim();
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

    type WhereInput = {
      requesterName?: { startsWith: string };
      orderDate?: { gte?: Date; lte?: Date };
      createdById?: string;
    };

    const conditions: WhereInput = {};

    const isRequesterOnly = session.roles.length === 1 && session.roles.includes("REQUESTER");
    if (isRequesterOnly) {
      conditions.createdById = session.id;
    }

    if (requester) {
      conditions.requesterName = { startsWith: requester };
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

    const [archives, total] = await Promise.all([
      db.archivedOrder.findMany({
        where: conditions,
        orderBy: { archivedAt: "desc" },
        take: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      }),
      db.archivedOrder.count({ where: conditions }),
    ]);

    return NextResponse.json({ data: archives, total });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
