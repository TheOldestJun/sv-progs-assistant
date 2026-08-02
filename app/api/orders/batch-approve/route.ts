/*
 * POST /api/orders/batch-approve — пакетное одобрение всех PENDING_DIRECTORATE
 * позиций для указанного заявителя (HEAD_OF_SUPPLY, ADMIN, DIRECTORATE).
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { OrderItemStatus, Role } from "@prisma/client";
import { verifyCsrf } from "@/app/lib/csrf";
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

  const allowedRoles: Role[] = [Role.ADMIN, Role.HEAD_OF_SUPPLY, Role.DIRECTORATE];
  if (!session.roles.some((r) => allowedRoles.includes(r as Role))) {
    return NextResponse.json(
      { error: "Только администратор, начальник снабжения или директор может одобрять заявки" },
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
      where: { status: OrderItemStatus.PENDING_DIRECTORATE, order: orderFilter },
      select: { id: true, orderId: true },
    });

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Нет заявок, ожидающих одобрения" },
        { status: 400 },
      );
    }

    // Обновляем статус и пишем лог в одной транзакции
    await db.$transaction(
      items.flatMap((item) => [
        db.orderItem.update({
          where: { id: item.id },
          data: { status: OrderItemStatus.DIRECTORATE_APPROVED },
        }),
        db.orderItemStatusLog.create({
          data: {
            orderItemId: item.id,
            oldStatus: OrderItemStatus.PENDING_DIRECTORATE,
            newStatus: OrderItemStatus.DIRECTORATE_APPROVED,
            changedById: session.id,
            ...(changedAt && typeof changedAt === "string" ? { changedAt: new Date(changedAt + "T00:00:00") } : {}),
          },
        }),
      ]),
    );

    return NextResponse.json({ success: true, count: items.length });
  } catch (error) {
    return handleApiError(error, "orders / batch-approve");
  }
}