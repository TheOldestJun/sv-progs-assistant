/*
 * tryArchiveOrder — проверяет, все ли позиции заявки в финальном статусе.
 * Если да — создаёт ArchivedOrder и удаляет оригинал в транзакции.
 * Вызывается после смены статуса позиции (PATCH) и после публичного подтверждения (POST /confirm).
 * Возвращает true если заявка была заархивирована.
 */
import { db } from "@/app/lib/db";
import { AUTO_ARCHIVE_STATUSES } from "@/app/lib/orderStatuses";

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
          product: { select: { id: true, title: true } },
          units: { select: { title: true } },
          statusLogs: {
            orderBy: { changedAt: "asc" },
            select: {
              oldStatus: true,
              newStatus: true,
              changedAt: true,
              changedBy: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!order || order.items.length === 0) return false;

  const allFinished = order.items.every((it) => AUTO_ARCHIVE_STATUSES.includes(it.status));
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

  // Снимок каждой позиции: скан ТМЦ + полная история статусов с датами и именем исполнителя.
  // changedByName/createdById храним как снимок без FK — юзера могут удалить.
  const items = order.items.map((it) => ({
    productId: it.product.id,
    productTitle: it.product.title,
    unitTitle: it.units.title,
    quantity: it.quantity,
    comment: it.comment,
    finalStatus: it.status,
    statusLogs: {
      create: it.statusLogs.map((log) => ({
        oldStatus: log.oldStatus,
        newStatus: log.newStatus,
        changedAt: log.changedAt,
        changedById: log.changedBy?.id ?? null,
        changedByName: log.changedBy?.name ?? null,
      })),
    },
  }));

  await db.$transaction([
    db.archivedOrder.create({
      data: {
        originalId: order.id,
        requesterName: order.requester.name,
        orderDate: order.created,
        receivedAt,
        items: { create: items },
        createdById: order.createdById,
      },
    }),
    db.order.delete({ where: { id: orderId } }),
  ]);

  return true;
}
