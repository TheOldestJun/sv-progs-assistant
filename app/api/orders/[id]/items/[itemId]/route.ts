/*
 * GET   /api/orders/:id/items/:itemId — история статусов позиции
 * PATCH /api/orders/:id/items/:itemId — обновление статуса или замена ТМЦ в позиции
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { OrderItemStatus, Role } from "@prisma/client";

/*
 * Роли, которым разрешено менять ТМЦ в позиции
 */
const PRODUCT_EDIT_ROLES: Role[] = [
  Role.ADMIN,
  Role.HEAD_OF_SUPPLY,
  Role.SUPPLY_DEPT,
  Role.WAREHOUSE,
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { itemId } = await params;

    const logs = await db.orderItemStatusLog.findMany({
      where: { orderItemId: itemId },
      orderBy: { changedAt: "desc" },
      include: {
        changedBy: { select: { name: true } },
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, itemId } = await params;

    const body = await _request.json();
    const { status, quantity, warehouseMode, changedAt, productId } = body;

    const item = await db.orderItem.findFirst({
      where: { id: itemId, orderId: id },
      include: {
        product: { select: { id: true, title: true } },
        units: { select: { title: true } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Order item not found" }, { status: 404 });
    }

    // ——— Обновление количества ———
    if (quantity !== undefined) {
      if (typeof quantity !== "number" || quantity <= 0) {
        return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 });
      }

      const updated = await db.orderItem.update({
        where: { id: itemId },
        data: { quantity },
        include: {
          product: { select: { title: true } },
          units: { select: { title: true } },
        },
      });

      return NextResponse.json(updated);
    }

    // ——— Замена ТМЦ ———
    // productId пришёл — меняем продукт в позиции, статус не трогаем
    if (productId) {
      if (!session.roles.some((r) => PRODUCT_EDIT_ROLES.includes(r as Role))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const product = await db.product.findUnique({ where: { id: productId } });
      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      const updated = await db.orderItem.update({
        where: { id: itemId },
        data: { productId },
        include: {
          product: { select: { title: true } },
          units: { select: { title: true } },
        },
      });

      return NextResponse.json(updated);
    }

    // ——— Смена статуса ——— (существующая логика)
    if (!status || !Object.values(OrderItemStatus).includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${Object.values(OrderItemStatus).join(", ")}` },
        { status: 400 },
      );
    }

    if (warehouseMode) {
      if (!session.roles.includes(Role.WAREHOUSE)) {
        return NextResponse.json(
          { error: "Только кладовщик может подтвердить получение товара" },
          { status: 403 },
        );
      }
      if (status !== OrderItemStatus.RECEIVED) {
        return NextResponse.json(
          { error: "Кладовщик может только подтвердить получение товара (RECEIVED)" },
          { status: 403 },
        );
      }
    } else if (status === OrderItemStatus.RECEIVED && !session.roles.includes(Role.ADMIN)) {
      return NextResponse.json(
        { error: "Только кладовщик может подтвердить получение товара" },
        { status: 403 },
      );
    }

    if (item.status === OrderItemStatus.RECEIVED && !session.roles.includes(Role.ADMIN)) {
      return NextResponse.json(
        { error: "Нельзя изменить статус после получения товара на склад" },
        { status: 400 },
      );
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
                ...(changedAt ? { changedAt: new Date(changedAt + "T00:00:00") } : {}),
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
