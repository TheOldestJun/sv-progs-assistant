/*
 * GET /api/confirm/:token — информация о позиции заявки по токену.
 * POST /api/confirm/:token — подтверждение получения конкретной позиции.
 * Не требует авторизации — одноразовый токен в URL.
 * POST переводит конкретный пункт SENT_TO_REQUESTER → ORDER_CONFIRMED.
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { OrderItemStatus } from "@prisma/client";
import { tryArchiveOrder } from "@/app/lib/tryArchiveOrder";

const ITEM_INCLUDE = {
  product: { select: { title: true } },
  units: { select: { title: true } },
  order: {
    select: {
      id: true,
      created: true,
      requester: { select: { name: true } },
    },
  },
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const confirmToken = await db.orderConfirmToken.findUnique({
      where: { token },
      include: { orderItem: { include: ITEM_INCLUDE } },
    });

    if (!confirmToken) {
      return NextResponse.json(
        { used: true, order: null },
        { status: 200 },
      );
    }

    if (confirmToken.usedAt) {
      return NextResponse.json(
        { error: "Эта ссылка уже была использована" },
        { status: 400 },
      );
    }

    if (confirmToken.orderItem.status !== OrderItemStatus.SENT_TO_REQUESTER) {
      return NextResponse.json(
        { error: "Позиция уже подтверждена или не в статусе ожидания" },
        { status: 400 },
      );
    }

    const systemUserId = await getSystemUserId();

    await db.$transaction([
      db.orderConfirmToken.update({
        where: { id: confirmToken.id },
        data: { usedAt: new Date() },
      }),
      db.orderItem.update({
        where: { id: confirmToken.orderItemId },
        data: { status: OrderItemStatus.ORDER_CONFIRMED },
      }),
      db.orderItemStatusLog.create({
        data: {
          orderItemId: confirmToken.orderItemId,
          oldStatus: OrderItemStatus.SENT_TO_REQUESTER,
          newStatus: OrderItemStatus.ORDER_CONFIRMED,
          changedById: systemUserId,
        },
      }),
    ]);

    // Автоархивация заявки, если все её позиции в финальном статусе
    await tryArchiveOrder(confirmToken.orderItem.order.id);

    return NextResponse.json({
      success: true,
      message: "Получение позиции подтверждено",
      item: {
        product: confirmToken.orderItem.product.title,
        unit: confirmToken.orderItem.units.title,
        quantity: confirmToken.orderItem.quantity,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const confirmToken = await db.orderConfirmToken.findUnique({
      where: { token },
      include: { orderItem: { include: ITEM_INCLUDE } },
    });

    // Токен не найден — либо использован (и удалён каскадно с заявкой), либо неверный
    if (!confirmToken) {
      return NextResponse.json(
        { used: true, order: null },
        { status: 200 },
      );
    }

    const item = confirmToken.orderItem;
    const order = item.order;

    return NextResponse.json({
      used: !!confirmToken.usedAt,
      order: {
        id: order.id,
        requester: order.requester.name,
        created: order.created,
      },
      item: {
        id: item.id,
        product: item.product.title,
        unit: item.units.title,
        quantity: item.quantity,
        status: item.status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Получение ID системного пользователя (первый найденный WAREHOUSE или ADMIN) для записи в statusLog.
 * Публичное подтверждение не привязано к авторизованному пользователю.
 */
async function getSystemUserId(): Promise<string> {
  const warehouseUser = await db.user.findFirst({
    where: {
      roles: { some: { role: { in: ["WAREHOUSE", "ADMIN"] } } },
    },
    select: { id: true },
  });
  if (!warehouseUser) {
    throw new Error("Нет доступных пользователей для записи лога");
  }
  return warehouseUser.id;
}
