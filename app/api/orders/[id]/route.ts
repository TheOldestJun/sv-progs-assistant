/*
 * DELETE /api/orders/:id — архивирует, затем удаляет заявку.
 * Архивирование сохраняет краткие данные (заявитель, даты, список пунктов).
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { OrderItemStatus } from "@/app/generated/prisma/enums";

const RECEIVED = OrderItemStatus.RECEIVED;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        requester: { select: { name: true } },
        items: {
          include: {
            product: { select: { title: true } },
            units: { select: { title: true } },
            statusLogs: {
              where: { newStatus: RECEIVED },
              select: { changedAt: true },
              orderBy: { changedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const allReceived = order.items.every((it) => it.status === RECEIVED);
    if (!allReceived) {
      return NextResponse.json(
        { error: "Можно удалить только заявку, все позиции которой получены на склад" },
        { status: 400 },
      );
    }

    // Находим дату получения последней позиции
    const receivedTimestamps = order.items
      .map((it) => it.statusLogs[0]?.changedAt)
      .filter(Boolean) as Date[];
    const receivedAt =
      receivedTimestamps.length > 0
        ? new Date(Math.max(...receivedTimestamps.map((d) => d.getTime())))
        : new Date();

    const items = order.items.map((it) => ({
      product: it.product.title,
      unit: it.units.title,
      quantity: it.quantity,
      comment: it.comment,
    }));

    await db.$transaction([
      db.archivedOrder.create({
        data: {
          originalId: order.id,
          requesterName: order.requester.name,
          orderDate: order.created,
          receivedAt,
          items,
        },
      }),
      db.order.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
