/*
 * GET    /api/orders/:id/items/:itemId — история статусов позиции
 * PATCH  /api/orders/:id/items/:itemId — обновление статуса или замена ТМЦ в позиции.
 *   Дополнительная логика при смене статуса:
 *   - SENT_TO_REQUESTER: генерируется одноразовый токен подтверждения (OrderConfirmToken).
 *     Если заявитель привязан к пользователю — отправляется внутреннее сообщение.
 *   - Любой финальный статус (RECEIVED/SENT_TO_REQUESTER/ORDER_CONFIRMED): проверка
 *     автоархивации через tryArchiveOrder().
 * DELETE /api/orders/:id/items/:itemId — админ: удаляет пункт из заявки и создаёт новую
 *                                        с тем же заявителем/датой + пометка "непредвиденные проблемы"
 *
 * Доступ:
 * - Статусы RECEIVED/SENT_TO_REQUESTER — только склад или админ
 * - ORDER_CONFIRMED — склад, админ, или заявитель своей заявки (SENT_TO_REQUESTER → ORDER_CONFIRMED)
 * - После ORDER_CONFIRMED статус заблокирован (кроме админа)
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { OrderItemStatus, Role } from "@prisma/client";
import { randomBytes } from "crypto";
import { tryArchiveOrder } from "@/app/lib/tryArchiveOrder";
import { verifyCsrf } from "@/app/lib/csrf";

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
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
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
    const { id, itemId } = await params;

    const body = await request.json();
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

    // Статусы, которые может менять только склад (или админ):
    // RECEIVED (склад принимает товар), SENT_TO_REQUESTER (склад отправляет заявителю)
    const WAREHOUSE_ONLY_STATUSES: OrderItemStatus[] = [
      OrderItemStatus.RECEIVED,
      OrderItemStatus.SENT_TO_REQUESTER,
    ];

    // Проверяем, является ли текущий пользователем заявителем этой заявки
    const isOwnOrder = await db.order.findFirst({
      where: { id, requester: { userId: session.id } },
      select: { id: true },
    });

    if (warehouseMode) {
      if (!session.roles.includes(Role.WAREHOUSE)) {
        return NextResponse.json(
          { error: "Только кладовщик может выполнять это действие" },
          { status: 403 },
        );
      }
      if (!WAREHOUSE_ONLY_STATUSES.includes(status) && status !== OrderItemStatus.ORDER_CONFIRMED) {
        return NextResponse.json(
          { error: "Кладовщик может только RECEIVE, SENT_TO_REQUESTER или ORDER_CONFIRMED" },
          { status: 403 },
        );
      }
    } else if (WAREHOUSE_ONLY_STATUSES.includes(status) && !session.roles.includes(Role.ADMIN)) {
      // Заявитель может подтвердить получение своей заявки (SENT_TO_REQUESTER → ORDER_CONFIRMED)
      const isRequesterConfirm = isOwnOrder && status === OrderItemStatus.ORDER_CONFIRMED && item.status === OrderItemStatus.SENT_TO_REQUESTER;
      if (!isRequesterConfirm) {
        return NextResponse.json(
          { error: "Только кладовщик может выполнять это действие" },
          { status: 403 },
        );
      }
    }

    // Запрет менять статус после финального (ORDER_CONFIRMED)
    if (item.status === OrderItemStatus.ORDER_CONFIRMED && !session.roles.includes(Role.ADMIN)) {
      return NextResponse.json(
        { error: "Нельзя изменить статус после подтверждения получения заказчиком" },
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

    // При переводе в SENT_TO_REQUESTER — генерируем одноразовый токен для этого пункта заявки
    let confirmationToken: string | null = null;
    if (status === OrderItemStatus.SENT_TO_REQUESTER) {
      confirmationToken = randomBytes(32).toString("hex");
      await db.orderConfirmToken.create({
        data: {
          orderItemId: itemId,
          token: confirmationToken,
        },
      });

      // Если заявитель — пользователь системы — уведомляем во внутренних сообщениях
      const order = await db.order.findUnique({
        where: { id },
        select: {
          requester: { select: { userId: true } },
          items: {
            where: { id: itemId },
            select: { product: { select: { title: true } }, quantity: true, units: { select: { title: true } } },
          },
        },
      });
      if (order?.requester.userId && order.items[0]) {
        const item = order.items[0];
        await db.message.create({
          data: {
            senderId: session.id,
            receiverId: order.requester.userId,
            text: `Позиция «${item.product.title}» (${item.quantity} ${item.units.title}) готова к получению. Откройте заявку и подтвердите получение.`,
          },
        });
      }
    }

    // Автоархивация: если все позиции заявки в финальном статусе — перемещаем в архив
    const archived = await tryArchiveOrder(id);

    return NextResponse.json({ ...updated, confirmationToken, archived });
  } catch (error) {
    console.error("[PATCH status] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const csrf = verifyCsrf(request);
  if (!csrf.valid) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const session = await getSession();
  if (!session || !session.roles.includes(Role.ADMIN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id, itemId } = await params;

    // Читаем причину из тела запроса
    let reason = "непредвиденные проблемы";
    try {
      const body = await request.json();
      if (body.reason && typeof body.reason === "string" && body.reason.trim()) {
        reason = body.reason.trim();
      }
    } catch {
      // тела нет — используем значение по умолчанию
    }

    // Читаем позицию с данными заявки
    const item = await db.orderItem.findFirst({
      where: { id: itemId, orderId: id },
      include: {
        order: { select: { requesterId: true, created: true, createdById: true } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Order item not found" }, { status: 404 });
    }

    // Создаём новую заявку с этой позицией и пометкой "непредвиденные проблемы"
    const [newOrder] = await db.$transaction([
      db.order.create({
        data: {
          requesterId: item.order.requesterId,
          created: item.order.created,
          createdById: item.order.createdById,
          items: {
            create: {
              productId: item.productId,
              unitId: item.unitId,
              quantity: item.quantity,
              comment: reason,
            },
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
      }),
      // Удаляем позицию из старой заявки
      db.orderItem.delete({ where: { id: itemId } }),
    ]);

    return NextResponse.json({ success: true, newOrder });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
