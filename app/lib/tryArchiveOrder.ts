/*
 * tryArchiveOrder — проверяет, все ли позиции заявки в финальном статусе.
 * Если да — создаёт ArchivedOrder и удаляет оригинал в транзакции.
 * Вызывается после смены статуса позиции (PATCH) и после публичного подтверждения (POST /confirm).
 * Возвращает true если заявка была заархивирована.
 */
import { db } from "@/app/lib/db";
import { OrderItemStatus } from "@prisma/client";

const FINAL_STATUSES: OrderItemStatus[] = [
  OrderItemStatus.RECEIVED,
  OrderItemStatus.SENT_TO_REQUESTER,
  OrderItemStatus.ORDER_CONFIRMED,
];

export async function tryArchiveOrder(orderId: string): Promise<boolean> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      requesterId: true,
      created: true,
      createdById: true,
      requester: { select: { name: true } },
      items: {
        select: {
          id: true,
          status: true,
          quantity: true,
          comment: true,
          product: { select: { title: true } },
          units: { select: { title: true } },
          statusLogs: {
            orderBy: { changedAt: "desc" },
            take: 1,
            select: { changedAt: true, newStatus: true },
          },
        },
      },
    },
  });

  if (!order || order.items.length === 0) return false;

  const allFinished = order.items.every((it) => FINAL_STATUSES.includes(it.status));
  if (!allFinished) return false;

  // Берём последнюю дату изменения статуса из логов всех позиций
  const lastTimestamps = order.items
    .flatMap((it) => it.statusLogs)
    .map((log) => log.changedAt)
    .filter(Boolean) as Date[];
  const receivedAt =
    lastTimestamps.length > 0
      ? new Date(Math.max(...lastTimestamps.map((d) => d.getTime())))
      : new Date();

  const items = order.items.map((it) => ({
    product: it.product.title,
    unit: it.units.title,
    quantity: it.quantity,
    comment: it.comment,
  }));

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
    db.order.delete({ where: { id: orderId } }),
  ]);

  return true;
}
