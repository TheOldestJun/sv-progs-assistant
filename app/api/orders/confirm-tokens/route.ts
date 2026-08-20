/*
 * GET  /api/orders/confirm-tokens — список неиспользованных токенов подтверждения.
 * DELETE /api/orders/confirm-tokens — удаление «мёртвых» токенов: usedAt=null, но позиция уже ORDER_CONFIRMED.
 * Только для склада/админа.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { handleApiError } from "@/app/lib/api-errors";

export async function GET() {
  const session = await getSession();
  if (!session || !(session.roles.includes("WAREHOUSE") || session.roles.includes("ADMIN"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const tokens = await db.orderConfirmToken.findMany({
      where: {
        usedAt: null,
        orderItem: { status: { not: "ORDER_CONFIRMED" } },
      },
      include: {
        orderItem: {
          select: {
            id: true,
            status: true,
            quantity: true,
            product: { select: { title: true } },
            units: { select: { title: true } },
            order: {
              select: {
                id: true,
                created: true,
                requester: { select: { id: true, name: true, userId: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = tokens.map((t) => ({
      tokenId: t.id,
      token: t.token,
      createdAt: t.createdAt,
      orderId: t.orderItem.order.id,
      orderDate: t.orderItem.order.created,
      requester: {
        id: t.orderItem.order.requester.id,
        name: t.orderItem.order.requester.name,
        isUser: !!t.orderItem.order.requester.userId,
      },
      item: {
        id: t.orderItem.id,
        product: t.orderItem.product.title,
        unit: t.orderItem.units.title,
        quantity: t.orderItem.quantity,
        status: t.orderItem.status,
      },
    }));

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "orders / confirm-tokens");
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session || !(session.roles.includes("WAREHOUSE") || session.roles.includes("ADMIN"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { count } = await db.orderConfirmToken.deleteMany({
      where: {
        usedAt: null,
        orderItem: { status: "ORDER_CONFIRMED" },
      },
    });

    return NextResponse.json({ deleted: count });
  } catch (error) {
    return handleApiError(error, "orders / confirm-tokens DELETE");
  }
}