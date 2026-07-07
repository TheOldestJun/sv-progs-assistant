/*
 * Сброс и перезаполнение таблиц заявок (Order, OrderItem, OrderItemStatusLog).
 * Очищает: Requester, Product, Unit, Order, OrderItem, OrderItemStatusLog,
 *          PasswordResetRequest, ArchivedOrder.
 * Данные пользователей (User, UserRole) НЕ ТРОГАЮТСЯ.
 *
 * Использует ТОЛЬКО существующих пользователей:
 *   admin@mail.com       — ADMIN, HEAD_OF_SUPPLY, SUPPLY_DEPT, WAREHOUSE
 *   chef@mail.com        — HEAD_OF_SUPPLY
 *   requester@mail.com   — REQUESTER
 *   supply@mail.com      — SUPPLY_DEPT, WAREHOUSE
 *   warehouse@mail.com   — WAREHOUSE
 *
 * Запуск: npm run reseed
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const url = new URL(process.env.DATABASE_URL!);
url.searchParams.set("connectionLimit", "2");
const adapter = new PrismaMariaDb(url.toString());
const db = new PrismaClient({ adapter });

async function main() {
  console.log("Очистка таблиц (кроме пользователей)...");

  await db.orderItemStatusLog.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.archivedOrder.deleteMany();
  await db.requester.deleteMany();
  await db.product.deleteMany();
  await db.unit.deleteMany();
  await db.passwordResetRequest.deleteMany();

  const admin = await db.user.findFirst({ where: { email: "admin@mail.com" } });
  const chef = await db.user.findFirst({ where: { email: "chef@mail.com" } });
  const requesterUser = await db.user.findFirst({ where: { email: "requester@mail.com" } });
  const supply = await db.user.findFirst({ where: { email: "supply@mail.com" } });
  const warehouse = await db.user.findFirst({ where: { email: "warehouse@mail.com" } });

  if (!admin || !chef || !requesterUser || !supply || !warehouse) {
    console.error("Ошибка: не все пользователи найдены. Запустите seed.");
    process.exit(1);
  }

  console.log("Таблицы очищены");
  console.log("Создание тестовых данных...");

  // --- Продукты ---
  const productNames = [
    "Бумага офисная А4",
    "Тонер для картриджа",
    "Канцелярские скрепки",
    "Папка-скоросшиватель",
    "Маркер перманентный",
    "Степлер",
    "Скотч упаковочный",
    "Файл-вкладыш A4",
    "Ручка шариковая синяя",
    "Блок для записей",
  ];
  const products = await Promise.all(
    productNames.map((name) => db.product.create({ data: { title: name } })),
  );
  console.log(`  Продуктов: ${products.length}`);

  // --- Единицы ---
  const unitNames = ["шт", "уп", "кор", "пач"];
  const units = await Promise.all(
    unitNames.map((name) => db.unit.create({ data: { title: name } })),
  );
  console.log(`  Единиц: ${units.length}`);

  // --- Заявители ---
  // Обычные заявители (без привязки к пользователю) — для заявок от начальника снабжения
  const plainRequesters = await Promise.all(
    ["Иванов Иван Иванович", "Петров Пётр Петрович", "Сидорова Анна Сергеевна"].map((name) =>
      db.requester.create({ data: { name } }),
    ),
  );

  // Заявитель, привязанный к существующему REQUESTER-пользователю
  const requesterLinked = await db.requester.create({
    data: { name: "Тестовый заказчик", userId: requesterUser.id },
  });

  console.log(`  Заявителей: ${plainRequesters.length} + 1 (привязанный к requester@mail.com)`);

  // --- Заявки ---

  // Заявка #1: от admin, позиции частично продвинуты (через статусы)
  const [o1] = await Promise.all([
    db.order.create({
      data: {
        requesterId: plainRequesters[0].id,
        created: new Date("2026-06-25"),
        createdById: admin.id,
        items: {
          create: [
            { productId: products[0].id, unitId: units[3].id, quantity: 10, comment: "Срочно, закончилась на складе" },
            { productId: products[1].id, unitId: units[1].id, quantity: 3, comment: "Для HP LaserJet 4200" },
            { productId: products[8].id, unitId: units[1].id, quantity: 20, comment: "Только синие, масляная паста" },
          ],
        },
      },
      include: { items: true },
    }),
  ]);

  // Заявка #2: от chef (начальник снабжения)
  const [o2] = await Promise.all([
    db.order.create({
      data: {
        requesterId: plainRequesters[1].id,
        created: new Date("2026-06-27"),
        createdById: chef.id,
        items: {
          create: [
            { productId: products[4].id, unitId: units[0].id, quantity: 12, comment: "Только синие, толстый стержень" },
            { productId: products[5].id, unitId: units[0].id, quantity: 5 },
            { productId: products[7].id, unitId: units[1].id, quantity: 100 },
            { productId: products[9].id, unitId: units[0].id, quantity: 15, comment: "Формат A5, в клетку" },
          ],
        },
      },
      include: { items: true },
    }),
  ]);

  // Заявка #3: от admin
  const [o3] = await Promise.all([
    db.order.create({
      data: {
        requesterId: plainRequesters[2].id,
        created: new Date("2026-06-28"),
        createdById: admin.id,
        items: {
          create: [
            { productId: products[0].id, unitId: units[3].id, quantity: 50, comment: "Формат А4, плотность 80 г/м², 500 листов" },
            { productId: products[6].id, unitId: units[0].id, quantity: 10, comment: "Прозрачный, ширина 50 мм" },
          ],
        },
      },
      include: { items: true },
    }),
  ]);

  // Заявка #4: от requester@mail.com (сам заказчик создал), все позиции получены на склад
  const [o4] = await Promise.all([
    db.order.create({
      data: {
        requesterId: requesterLinked.id,
        created: new Date("2026-06-20"),
        createdById: requesterUser.id,
        items: {
          create: [
            { productId: products[2].id, unitId: units[1].id, quantity: 30 },
            { productId: products[3].id, unitId: units[0].id, quantity: 50, comment: "Пластиковые, формат А4" },
          ],
        },
      },
      include: { items: true },
    }),
  ]);

  // Заявка #5: от admin, свежая — только создана, без продвижения статусов
  const [o5] = await Promise.all([
    db.order.create({
      data: {
        requesterId: plainRequesters[0].id,
        created: new Date("2026-06-29"),
        createdById: admin.id,
        items: {
          create: [
            { productId: products[1].id, unitId: units[1].id, quantity: 5, comment: "Для Canon i-SENSYS" },
            { productId: products[8].id, unitId: units[2].id, quantity: 4, comment: "Красные, зелёные, синие — по 1 коробке, чёрные — 2 коробки" },
          ],
        },
      },
      include: { items: true },
    }),
  ]);

  // --- Статус-логи ---

  // Заявка #1: часть позиций продвинута
  // Позиция 1: ACCEPTED → INVOICE_RECEIVED (admin)
  await db.orderItemStatusLog.create({
    data: {
      orderItemId: o1.items[0].id,
      oldStatus: null,
      newStatus: "ACCEPTED",
      changedById: admin.id,
      changedAt: new Date("2026-06-25T09:00:00"),
    },
  });
  await db.orderItemStatusLog.create({
    data: {
      orderItemId: o1.items[0].id,
      oldStatus: "ACCEPTED",
      newStatus: "INVOICE_RECEIVED",
      changedById: admin.id,
      changedAt: new Date("2026-06-25T14:30:00"),
    },
  });
  // Позиция 2: ACCEPTED (supply)
  await db.orderItemStatusLog.create({
    data: {
      orderItemId: o1.items[1].id,
      oldStatus: null,
      newStatus: "ACCEPTED",
      changedById: supply.id,
      changedAt: new Date("2026-06-25T09:00:00"),
    },
  });

  // Заявка #4: все позиции прошли полный цикл до RECEIVED (warehouse)
  for (const item of o4.items) {
    await db.orderItemStatusLog.create({
      data: {
        orderItemId: item.id,
        oldStatus: null,
        newStatus: "ACCEPTED",
        changedById: admin.id,
        changedAt: new Date("2026-06-20T10:00:00"),
      },
    });
    await db.orderItemStatusLog.create({
      data: {
        orderItemId: item.id,
        oldStatus: "ACCEPTED",
        newStatus: "INVOICE_RECEIVED",
        changedById: supply.id,
        changedAt: new Date("2026-06-21T11:00:00"),
      },
    });
    await db.orderItemStatusLog.create({
      data: {
        orderItemId: item.id,
        oldStatus: "INVOICE_RECEIVED",
        newStatus: "INVOICE_PAID",
        changedById: admin.id,
        changedAt: new Date("2026-06-22T09:00:00"),
      },
    });
    await db.orderItemStatusLog.create({
      data: {
        orderItemId: item.id,
        oldStatus: "INVOICE_PAID",
        newStatus: "SHIPPED",
        changedById: supply.id,
        changedAt: new Date("2026-06-23T16:00:00"),
      },
    });
    await db.orderItemStatusLog.create({
      data: {
        orderItemId: item.id,
        oldStatus: "SHIPPED",
        newStatus: "RECEIVED",
        changedById: warehouse.id,
        changedAt: new Date("2026-06-24T12:00:00"),
      },
    });
  }

  console.log(`  Заявок: 5`);

  // --- Архивные заявки (имитация за 3 года хранения) ---
  await db.archivedOrder.createMany({
    data: [
      {
        originalId: "arch-001",
        requesterName: "Иванов Иван Иванович",
        orderDate: new Date("2025-12-01"),
        receivedAt: new Date("2025-12-15"),
        archivedAt: new Date("2025-12-20"),
        items: [
          { product: "Бумага офисная А4", unit: "пач", quantity: 20, comment: null },
          { product: "Тонер для картриджа", unit: "шт", quantity: 5, comment: null },
        ],
        createdById: admin.id,
      },
      {
        originalId: "arch-002",
        requesterName: "Петров Пётр Петрович",
        orderDate: new Date("2025-10-15"),
        receivedAt: new Date("2025-11-01"),
        archivedAt: new Date("2025-11-10"),
        items: [
          { product: "Маркер перманентный", unit: "шт", quantity: 12, comment: null },
        ],
        createdById: chef.id,
      },
      {
        originalId: "arch-003",
        requesterName: "Сидорова Анна Сергеевна",
        orderDate: new Date("2025-08-10"),
        receivedAt: new Date("2025-09-05"),
        archivedAt: new Date("2025-09-15"),
        items: [
          { product: "Папка-скоросшиватель", unit: "шт", quantity: 30, comment: null },
          { product: "Файл-вкладыш A4", unit: "уп", quantity: 5, comment: null },
          { product: "Ручка шариковая синяя", unit: "уп", quantity: 10, comment: null },
        ],
        createdById: admin.id,
      },
      {
        originalId: "arch-004",
        requesterName: "Тестовый заказчик",
        orderDate: new Date("2026-01-15"),
        receivedAt: new Date("2026-02-01"),
        archivedAt: new Date("2026-02-10"),
        items: [
          { product: "Канцелярские скрепки", unit: "уп", quantity: 10, comment: null },
          { product: "Степлер", unit: "шт", quantity: 3, comment: "Для бухгалтерии" },
        ],
        createdById: requesterUser.id,
      },
    ],
  });
  console.log(`  Архивных заявок: 4`);

  console.log("Готово");
}

main()
  .catch((e) => {
    console.error("Ошибка:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
