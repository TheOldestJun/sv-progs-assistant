/*
 * PATCH /api/orders/:id/items/:itemId
 * Обновление статуса позиции заявки.
 * body: { status: "ACCEPTED" | "INVOICE_RECEIVED" | "INVOICE_PAID" | "SHIPPED" | "RECEIVED" }
 * Создаёт запись в OrderItemStatusLog (кто + когда).
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { OrderItemStatus, Role } from "@/app/generated/prisma/enums";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isWarehouse = session.roles.includes(Role.WAREHOUSE);

  try {
    const { id, itemId } = await params;

    const body = await _request.json();
    const { status } = body;

    if (!status || !Object.values(OrderItemStatus).includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${Object.values(OrderItemStatus).join(", ")}` },
        { status: 400 },
      );
    }

    if (isWarehouse && status !== OrderItemStatus.RECEIVED) {
      return NextResponse.json(
        { error: "Кладовщик может только подтвердить получение товара (RECEIVED)" },
        { status: 403 },
      );
    }

    if (!isWarehouse && status === OrderItemStatus.RECEIVED) {
      return NextResponse.json(
        { error: "Только кладовщик может подтвердить получение товара" },
        { status: 403 },
      );
    }

    const item = await db.orderItem.findFirst({
      where: { id: itemId, orderId: id },
    });

    if (!item) {
      return NextResponse.json({ error: "Order item not found" }, { status: 404 });
    }

    const oldStatus = item.status !== status ? item.status : null;

    const [updated] = await db.$transaction([
      db.orderItem.update({
        where: { id: itemId },
        data: { status },
        include: {
          product: { select: { title: true } },
          units: { select: { title: true } },
        },
      }),
      ...(oldStatus
        ? [
            db.orderItemStatusLog.create({
              data: {
                orderItemId: itemId,
                oldStatus,
                newStatus: status,
                changedById: session.id,
              },
            }),
          ]
        : []),
    ]);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
