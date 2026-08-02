/*
 * PATCH /api/orders/:id — изменение даты заявки (только ADMIN).
 * DELETE /api/orders/:id — архивирует, затем удаляет заявку.
 *   - Без force: только если все позиции в финальном статусе (или все PENDING + заявитель)
 *   - С force (только ADMIN): принудительно, без проверки статусов
 *   - С permanent (только ADMIN, вместе с force): полное удаление БЕЗ записи в архив
 * Архивирование сохраняет краткие данные (заявитель, даты, список пунктов).
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import type { Role } from "@prisma/client";
import { verifyCsrf } from "@/app/lib/csrf";
import {
  DELETE_FINAL_STATUSES,
  PENDING_STATUSES,
  ARCHIVE_ROLES,
} from "@/app/lib/orderStatuses";
import { handleApiError } from "@/app/lib/api-errors";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrf = verifyCsrf(request);
  if (!csrf.valid) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || !session.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { created } = body;

    if (!created || typeof created !== "string") {
      return NextResponse.json({ error: "created (date string) is required" }, { status: 400 });
    }

    const updated = await db.order.update({
      where: { id },
      data: { created: new Date(created + "T12:00:00") },
      select: { id: true, created: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error, "orders / [id]");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrf = verifyCsrf(request);
  if (!csrf.valid) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const force = body.force === true;
    const permanent = body.permanent === true;

    const isAdmin = session.roles.includes("ADMIN");
    if ((force || permanent) && !isAdmin) {
      return NextResponse.json({ error: "Только администратор может принудительно удалять заявки" }, { status: 403 });
    }

    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        requesterId: true,
        created: true,
        createdById: true,
        requester: { select: { name: true, userId: true } },
        items: {
          select: {
            id: true,
            status: true,
            quantity: true,
            comment: true,
            product: { select: { title: true } },
            units: { select: { title: true } },
            statusLogs: {
              where: { newStatus: "RECEIVED" },
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

    if (!force) {
      const allFinished = order.items.every((it) => DELETE_FINAL_STATUSES.includes(it.status));
      const allPending = order.items.every((it) => PENDING_STATUSES.includes(it.status));
      const isRequester = session.id === order.requester.userId;

      if (allPending && isRequester) {
        // Заказчик может удалить заявку до утверждения директором
      } else if (!allFinished) {
        return NextResponse.json(
          { error: "Можно удалить только заявку, все позиции которой завершены" },
          { status: 400 },
        );
      } else if (!session.roles.some((r) => ARCHIVE_ROLES.includes(r as Role))) {
        // Завершённую заявку может архивировать только отдел снабжения/склад/админ
        return NextResponse.json(
          { error: "Только отдел снабжения или администратор может архивировать заявки" },
          { status: 403 },
        );
      }
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

    // Полное удаление без записи в архив (только ADMIN, только с force)
    if (permanent) {
      await db.order.delete({ where: { id } });
      return NextResponse.json({ success: true, permanent: true });
    }

    await db.$transaction([
      db.archivedOrder.create({
        data: {
          originalId: order.id,
          requesterName: order.requester.name,
          orderDate: order.created,
          receivedAt,
          items,
          createdById: order.createdById,
        },
      }),
      db.order.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "orders / [id]");
  }
}