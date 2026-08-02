/*
 * API: /api/orders
 * GET — список всех заявок с позициями (для отдела снабжения, склада).
 * POST — создание заявки с позициями (requesterId + items[{productId, unitId, quantity}]).
 * Требуется аутентификация.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { verifyCsrf } from "@/app/lib/csrf";
import { handleApiError } from "@/app/lib/api-errors";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // REQUESTER-only видят только заявки, адресованные им (через requester.userId)
    const isRequesterOnly = session.roles.length === 1 && session.roles.includes("REQUESTER");
    const where = isRequesterOnly ? { requester: { userId: session.id } } : {};

    const orders = await db.order.findMany({
      where,
      orderBy: { created: "desc" },
      take: 200, // Безопасный лимит — не даёт уйти в OOM при тысячах заявок
      include: {
        requester: { select: { name: true, userId: true } },
        items: {
          include: {
            product: { select: { title: true } },
            units: { select: { title: true } },
          },
          // statusLogs не включаем — грузим лениво при раскрытии строки (см. GET /api/orders/:id/items/:itemId/logs)
        },
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    return handleApiError(error, "orders");
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csrf = verifyCsrf(request);
  if (!csrf.valid) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const body = await request.json();
  const { requesterId, created, items } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "items are required" },
      { status: 400 },
    );
  }

  for (const item of items) {
    if (!item.productId || !item.unitId || !item.quantity) {
      return NextResponse.json(
        { error: "Each item must have productId, unitId, and quantity" },
        { status: 400 },
      );
    }
    if (typeof item.quantity !== "number" || item.quantity <= 0) {
      return NextResponse.json(
        { error: "Each item quantity must be a positive number" },
        { status: 400 },
      );
    }
  }

  try {
    // REQUESTER всегда создаёт заявку ТОЛЬКО от своего имени:
    // переданный requesterId для него игнорируется (иначе можно подменить заявителя).
    // Снабжение/админ могут указать любого заявителя.
    const isRequesterRole = session.roles.includes("REQUESTER");
    let resolvedRequesterId = requesterId;
    if (isRequesterRole || !resolvedRequesterId) {
      let requester = await db.requester.findUnique({ where: { userId: session.id } });
      if (!requester) {
        requester = await db.requester.create({
          data: { name: session.name, userId: session.id },
        });
      }
      resolvedRequesterId = requester.id;
    }

    const order = await db.order.create({
      data: {
        requesterId: resolvedRequesterId,
        createdById: session.id,
        ...(created ? { created: new Date(created + "T12:00:00") } : {}),
        items: {
          create: items.map((item: { productId: string; unitId: string; quantity: number; comment?: string }) => ({
            productId: item.productId,
            unitId: item.unitId,
            quantity: item.quantity,
            comment: item.comment || null,
          })),
        },
      },
      include: {
        requester: { select: { name: true } },
        items: {
          include: {
            product: { select: { title: true } },
            units: { select: { title: true } },
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleApiError(error, "orders");
  }
}