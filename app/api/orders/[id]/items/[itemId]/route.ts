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
 * - ORDER_CONFIRMED — только заявитель (через token) или админ
 * - После ORDER_CONFIRMED статус заблокирован (кроме админа)
 */
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getSession } from "@/app/lib/auth";
import { OrderItemStatus, Role } from "@prisma/client";
import { randomBytes } from "crypto";
import { tryArchiveOrder } from "@/app/lib/tryArchiveOrder";
import { verifyCsrf } from "@/app/lib/csrf";
import {
  STATUS_ORDER,
  PRODUCT_EDIT_ROLES,
  WAREHOUSE_ONLY_STATUSES,
  SUPPLY_WORKFLOW_STATUSES,
  SUPPLY_WORKFLOW_ROLES,
} from "@/app/lib/orderStatuses";
import { handleApiError } from "@/app/lib/api-errors";

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
    return handleApiError(error, "orders / [id] / items / [itemId]");
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
    const { status, quantity, warehouseMode, changedAt, productId, unitId } = body;

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
      // Количество, как и ТМЦ, может менять только отдел снабжения/склад/админ
      if (!session.roles.some((r) => PRODUCT_EDIT_ROLES.includes(r as Role))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
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

    // ——— Замена единицы измерения ———
    if (unitId) {
      if (!session.roles.some((r) => PRODUCT_EDIT_ROLES.includes(r as Role))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const unit = await db.unit.findUnique({ where: { id: unitId } });
      if (!unit) {
        return NextResponse.json({ error: "Unit not found" }, { status: 404 });
      }

      const updated = await db.orderItem.update({
        where: { id: itemId },
        data: { unitId },
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

    const isAdmin = session.roles.includes(Role.ADMIN);
    // Начальник снабжения, как и админ, может откатывать заявку на более ранний этап
    const isHeadOfSupply = session.roles.includes(Role.HEAD_OF_SUPPLY);

    // Позиция в каноническом порядке + флаг отката (переход на более ранний этап)
    const currentIdx = STATUS_ORDER.indexOf(item.status);
    const targetIdx = STATUS_ORDER.indexOf(status);
    const isRollback = targetIdx < currentIdx;

    // Статус одобрения директора — только ADMIN, HEAD_OF_SUPPLY или DIRECTORATE
    if (status === OrderItemStatus.DIRECTORATE_APPROVED) {
      const allowedRoles: Role[] = [Role.ADMIN, Role.HEAD_OF_SUPPLY, Role.DIRECTORATE];
      if (!session.roles.some((r) => allowedRoles.includes(r as Role))) {
        return NextResponse.json(
          { error: "Только администратор, начальник снабжения или директор может одобрять заявки" },
          { status: 403 },
        );
      }
      // Штатно — только из статуса ожидания; при откате (rollback) админу или
      // начальнику снабжения разрешено вернуться на этот шаг из более позднего этапа
      if (item.status !== OrderItemStatus.PENDING_DIRECTORATE && !(isRollback && (isAdmin || isHeadOfSupply))) {
        return NextResponse.json(
          { error: "Одобрение директора возможно только из статуса ожидания" },
          { status: 400 },
        );
      }
    }

    // Складские статусы (RECEIVED — приёмка, SENT_TO_REQUESTER — отправка заявителю):
    // только склад или админ
    if (warehouseMode) {
      if (!session.roles.includes(Role.WAREHOUSE)) {
        return NextResponse.json(
          { error: "Только кладовщик может выполнять это действие" },
          { status: 403 },
        );
      }
      if (!WAREHOUSE_ONLY_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: "Кладовщик может только RECEIVE или SENT_TO_REQUESTER" },
          { status: 403 },
        );
      }
    } else if (WAREHOUSE_ONLY_STATUSES.includes(status) && !isAdmin) {
      return NextResponse.json(
        { error: "Только кладовщик может выполнять это действие" },
        { status: 403 },
      );
    }

    // Проверяем, является ли текущий пользователь заявителем этой заявки
    // (нужно для подтверждения получения SENT_TO_REQUESTER → ORDER_CONFIRMED)
    const isOwnOrder = await db.order.findFirst({
      where: { id, requester: { userId: session.id } },
      select: { id: true },
    });

    // ORDER_CONFIRMED — подтверждает получение сам заявитель своей заявки или админ
    if (status === OrderItemStatus.ORDER_CONFIRMED && !isAdmin) {
      const isRequesterConfirm = isOwnOrder && item.status === OrderItemStatus.SENT_TO_REQUESTER;
      if (!isRequesterConfirm) {
        return NextResponse.json(
          { error: "Подтвердить получение может только заявитель этой заявки или администратор" },
          { status: 403 },
        );
      }
    }

    // Промежуточные статусы снабжения (ACCEPTED..SHIPPED) — только отдел снабжения/директор/админ
    if (SUPPLY_WORKFLOW_STATUSES.includes(status)) {
      if (!session.roles.some((r) => SUPPLY_WORKFLOW_ROLES.includes(r as Role))) {
        return NextResponse.json(
          { error: "Только отдел снабжения может изменять этот статус" },
          { status: 403 },
        );
      }
    }

    // Запрет менять статус после финального (ORDER_CONFIRMED)
    if (item.status === OrderItemStatus.ORDER_CONFIRMED && !isAdmin) {
      return NextResponse.json(
        { error: "Нельзя изменить статус после подтверждения получения заказчиком" },
        { status: 400 },
      );
    }

    // Forward-only для обычных отделов: нельзя откатить статус на более ранний этап.
    // Админ и начальник снабжения могут откат (isRollback — см. выше).
    // Пропуск этапов вперёд разрешён — UI «основного флоу» позволяет выбрать любой
    // последующий статус; строгий пошаговый порядок не навязываем, чтобы не ломать сценарии.
    if (isRollback && !isAdmin && !isHeadOfSupply) {
      return NextResponse.json(
        { error: "Нельзя изменить статус на более ранний этап" },
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
      ...(status === OrderItemStatus.ORDER_CONFIRMED
        ? [
            db.orderConfirmToken.updateMany({
              where: { orderItemId: itemId, usedAt: null },
              data: { usedAt: new Date() },
            }),
          ]
        : []),
    ]);

    // При переводе в ORDER_CONFIRMED — удаляем уведомление, которое было отправлено при SENT_TO_REQUESTER
    if (status === OrderItemStatus.ORDER_CONFIRMED) {
      const orderData = await db.order.findUnique({
        where: { id },
        select: {
          requester: { select: { userId: true } },
          items: {
            where: { id: itemId },
            select: { product: { select: { title: true } }, quantity: true, units: { select: { title: true } } },
          },
        },
      });
      if (orderData?.requester.userId && orderData.items[0]) {
        const msgItem = orderData.items[0];
        const expectedText = `Позиция «${msgItem.product.title}» (${msgItem.quantity} ${msgItem.units.title}) готова к получению. Откройте заявку и подтвердите получение.`;
        await db.message.deleteMany({ where: { receiverId: orderData.requester.userId, text: expectedText } });
      }
    }

    // При переводе в SENT_TO_REQUESTER — генерируем одноразовый токен для этого пункта заявки
    let confirmationToken: string | null = null;
    if (status === OrderItemStatus.SENT_TO_REQUESTER) {
      confirmationToken = randomBytes(32).toString("hex");
      await db.orderConfirmToken.upsert({
        where: { orderItemId: itemId },
        create: { orderItemId: itemId, token: confirmationToken },
        update: { token: confirmationToken },
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
    return handleApiError(error, "orders / [id] / items / [itemId]");
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
    return handleApiError(error, "orders / [id] / items / [itemId]");
  }
}