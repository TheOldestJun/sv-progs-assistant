/*
 * GET /api/orders/my-pending-confirm — проверяет, есть ли у текущего пользователя
 * заявки со статусом SENT_TO_REQUESTER (ожидающие подтверждения получения).
 * Для показа тоста-подсказки при входе.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { OrderItemStatus } from "@prisma/client";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ищем заявители, привязанные к текущему пользователю
    const requester = await db.requester.findFirst({
      where: { userId: session.id },
      select: { id: true },
    });

    if (!requester) {
      return NextResponse.json({ pending: 0, orders: [] });
    }

    // Ищем активные заявки этого заявителя с позициями SENT_TO_REQUESTER
    const orders = await db.order.findMany({
      where: {
        requesterId: requester.id,
        items: { some: { status: OrderItemStatus.SENT_TO_REQUESTER } },
      },
      select: {
        id: true,
        created: true,
        items: {
          where: { status: OrderItemStatus.SENT_TO_REQUESTER },
          select: { id: true },
        },
      },
    });

    const totalPending = orders.reduce((sum, o) => sum + o.items.length, 0);

    return NextResponse.json({ pending: totalPending, orders: orders.map((o) => o.id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
