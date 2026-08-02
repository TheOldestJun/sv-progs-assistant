/*
 * POST /api/orders/batch-accept — пакетное принятие в работу всех
 * DIRECTORATE_APPROVED позиций указанного заявителя или заказа.
 * Доступ: ADMIN, HEAD_OF_SUPPLY, SUPPLY_DEPT, DIRECTORATE.
 * Аналог batch-approve, но для шага DIRECTORATE_APPROVED → ACCEPTED.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { OrderItemStatus } from "@prisma/client";
import type { Role } from "@prisma/client";
import { verifyCsrf } from "@/app/lib/csrf";
import { SUPPLY_WORKFLOW_ROLES } from "@/app/lib/orderStatuses";
import { handleApiError } from "@/app/lib/api-errors";

export async function POST(request: Request) {
  const csrf = verifyCsrf(request);
  if (!csrf.valid) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.roles.some((r) => SUPPLY_WORKFLOW_ROLES.includes(r as Role))) {
    return NextResponse.json(
      { error: "Только сотрудники снабжения могут принимать заявки в работу" },
      { status: 403 },
    );
  }

  try {
    const { requesterId, orderId, changedAt } = await request.json();

    let orderFilter: Record<string, string> | undefined;
    if (orderId && typeof orderId === "string") {
      orderFilter = { id: orderId };
    } else if (requesterId && typeof requesterId === "string") {
      orderFilter = { requesterId };
    } else {
      return NextResponse.json(
        { error: "Требуется orderId или requesterId" },
        { status: 400 },
      );
    }

    const items = await db.orderItem.findMany({
      where: { status: OrderItemStatus.DIRECTORATE_APPROVED, order: orderFilter },
      select: { id: true, orderId: true },
    });

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Нет заявок, ожидающих принятия в работу" },
        { status: 400 },
      );
    }

    // Обновляем статус и пишем лог в одной транзакции
    await db.$transaction(
      items.flatMap((item) => [
        db.orderItem.update({
          where: { id: item.id },
          data: { status: OrderItemStatus.ACCEPTED },
        }),
        db.orderItemStatusLog.create({
          data: {
            orderItemId: item.id,
            oldStatus: OrderItemStatus.DIRECTORATE_APPROVED,
            newStatus: OrderItemStatus.ACCEPTED,
            changedById: session.id,
            ...(changedAt && typeof changedAt === "string" ? { changedAt: new Date(changedAt + "T00:00:00") } : {}),
          },
        }),
      ]),
    );

    return NextResponse.json({ success: true, count: items.length });
  } catch (error) {
    return handleApiError(error, "orders / batch-accept");
  }
}