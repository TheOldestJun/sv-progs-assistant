/*
 * Сброс и перезаполнение таблиц заявок (Order, OrderItem, OrderItemStatusLog).
 * Очищает: Requester, Product, Unit, Order, OrderItem, OrderItemStatusLog,
 *          PasswordResetRequest, ArchivedOrder.
 * Данные пользователей (User, UserRole) НЕ ТРОГАЮТСЯ.
 *
 * Затем создаёт заново тестовые продукты, единицы, заявителей и несколько заявок
 * с разными статусами позиций и историей изменений.
 * REQUESTER-пользователи (ivanova@mail.com, sokolov@mail.com) ДОЛЖНЫ уже существовать —
 * им создаются только Requester-записи.
 *
 * Запуск: npm run reseed
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "",
  connectionLimit: 5,
});
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🔄 Очистка таблиц (кроме пользователей)...");

  await db.orderItemStatusLog.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.archivedOrder.deleteMany();
  await db.requester.deleteMany();
  await db.product.deleteMany();
  await db.unit.deleteMany();
  await db.passwordResetRequest.deleteMany();

  const adminUser = await db.user.findFirst({ where: { email: "admin@mail.com" } });
  const ivanovaUser = await db.user.findFirst({ where: { email: "ivanova@mail.com" } });
  const sokolovUser = await db.user.findFirst({ where: { email: "sokolov@mail.com" } });

  if (!adminUser) {
    console.error("❌ Пользователь admin@mail.com не найден. Сначала выполните seed.");
    process.exit(1);
  }

  console.log("✅ Таблицы очищены");
  console.log("🌱 Создание тестовых данных...");

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
  console.log(`  Продукты: ${products.length}`);

  // --- Единицы ---
  const unitNames = ["шт", "уп", "кор", "пач"];
  const units = await Promise.all(
    unitNames.map((name) => db.unit.create({ data: { title: name } })),
  );
  console.log(`  Единицы: ${units.length}`);

  // --- Заявители ---
  // Трое первых — обычные заявители (для заявок от начальника снабжения или отдела снабжения)
  const requesterNames = [
    "Иванов Иван Иванович",
    "Петров Пётр Петрович",
    "Сидорова Анна Сергеевна",
  ];
  const requesters = await Promise.all(
    requesterNames.map((name) => db.requester.create({ data: { name } })),
  );

  // REQUESTER-пользователи: создаём Requester-записи, привязанные к существующим пользователям
  const requesterLinked1 = ivanovaUser
    ? await db.requester.create({ data: { name: "Иванова Елена", userId: ivanovaUser.id } })
    : null;
  const requesterLinked2 = sokolovUser
    ? await db.requester.create({ data: { name: "Соколов Андрей", userId: sokolovUser.id } })
    : null;

  console.log(`  Заявители: ${requesters.length}${requesterLinked1 ? " + Иванова Елена" : ""}${requesterLinked2 ? " + Соколов Андрей" : ""}`);

  // --- Заявки ---
  const [o1] = await Promise.all([
    db.order.create({
      data: {
        requesterId: requesters[0].id,
        created: new Date("2026-06-25"),
        createdById: adminUser?.id,
        items: {
          create: [
            {
              productId: products[0].id,
              unitId: units[3].id,
              quantity: 10,
              comment: "Срочно, закончилась на складе",
            },
            {
              productId: products[1].id,
              unitId: units[1].id,
              quantity: 3,
              comment: "Для HP LaserJet 4200",
            },
            {
              productId: products[8].id,
              unitId: units[1].id,
              quantity: 20,
              comment: "Только синие, масляная паста",
            },
          ],
        },
      },
      include: { items: true },
    }),
  ]);

  const [o2] = await Promise.all([
    db.order.create({
      data: {
        requesterId: requesters[1].id,
        created: new Date("2026-06-27"),
        createdById: adminUser?.id,
        items: {
          create: [
            {
              productId: products[4].id,
              unitId: units[0].id,
              quantity: 12,
              comment: "Только синие, толстый стержень",
            },
            {
              productId: products[5].id,
              unitId: units[0].id,
              quantity: 5,
            },
            {
              productId: products[7].id,
              unitId: units[1].id,
              quantity: 100,
            },
            {
              productId: products[9].id,
              unitId: units[0].id,
              quantity: 15,
              comment: "Формат A5, в клетку",
            },
          ],
        },
      },
      include: { items: true },
    }),
  ]);

  const [o3] = await Promise.all([
    db.order.create({
      data: {
        requesterId: requesters[2].id,
        created: new Date("2026-06-28"),
        createdById: adminUser?.id,
        items: {
          create: [
            {
              productId: products[0].id,
              unitId: units[3].id,
              quantity: 50,
              comment: "Формат А4, плотность 80 г/м², 500 листов",
            },
            {
              productId: products[6].id,
              unitId: units[0].id,
              quantity: 10,
              comment: "Прозрачный, ширина 50 мм",
            },
          ],
        },
      },
      include: { items: true },
    }),
  ]);

  const [o4] = requesterLinked1
    ? await Promise.all([
        db.order.create({
          data: {
            requesterId: requesterLinked1.id,
            created: new Date("2026-06-20"),
            createdById: ivanovaUser!.id,
            items: {
              create: [
                {
                  productId: products[2].id,
                  unitId: units[1].id,
                  quantity: 30,
                },
                {
                  productId: products[3].id,
                  unitId: units[0].id,
                  quantity: 50,
                  comment: "Пластиковые, формат А4",
                },
              ],
            },
          },
          include: { items: true },
        }),
      ])
    : [];

  const [o5] = requesterLinked2
    ? await Promise.all([
        db.order.create({
          data: {
            requesterId: requesterLinked2.id,
            created: new Date("2026-06-29"),
            createdById: sokolovUser!.id,
            items: {
              create: [
                {
                  productId: products[1].id,
                  unitId: units[1].id,
                  quantity: 5,
                  comment: "Для Canon i-SENSYS",
                },
                {
                  productId: products[8].id,
                  unitId: units[2].id,
                  quantity: 4,
                  comment: "Красные, зелёные, синие — по 1 коробке, чёрные — 2 коробки",
                },
              ],
            },
          },
          include: { items: true },
        }),
      ])
    : [];

  if (adminUser) {
    // Статус-логи для первой заявки — часть позиций уже продвинута
    await db.orderItemStatusLog.create({
      data: {
        orderItemId: o1.items[0].id,
        oldStatus: null,
        newStatus: "ACCEPTED",
        changedById: adminUser.id,
        changedAt: new Date("2026-06-25T09:00:00"),
      },
    });
    await db.orderItemStatusLog.create({
      data: {
        orderItemId: o1.items[0].id,
        oldStatus: "ACCEPTED",
        newStatus: "INVOICE_RECEIVED",
        changedById: adminUser.id,
        changedAt: new Date("2026-06-25T14:30:00"),
      },
    });
    await db.orderItemStatusLog.create({
      data: {
        orderItemId: o1.items[1].id,
        oldStatus: null,
        newStatus: "ACCEPTED",
        changedById: adminUser.id,
        changedAt: new Date("2026-06-25T09:00:00"),
      },
    });

    // Четвёртая заявка — все позиции уже получены на склад
    if (o4) {
      for (const item of o4.items) {
        await db.orderItemStatusLog.create({
          data: {
            orderItemId: item.id,
            oldStatus: null,
            newStatus: "ACCEPTED",
            changedById: adminUser.id,
            changedAt: new Date("2026-06-20T10:00:00"),
          },
        });
        await db.orderItemStatusLog.create({
          data: {
            orderItemId: item.id,
            oldStatus: "ACCEPTED",
            newStatus: "INVOICE_RECEIVED",
            changedById: adminUser.id,
            changedAt: new Date("2026-06-21T11:00:00"),
          },
        });
        await db.orderItemStatusLog.create({
          data: {
            orderItemId: item.id,
            oldStatus: "INVOICE_RECEIVED",
            newStatus: "INVOICE_PAID",
            changedById: adminUser.id,
            changedAt: new Date("2026-06-22T09:00:00"),
          },
        });
        await db.orderItemStatusLog.create({
          data: {
            orderItemId: item.id,
            oldStatus: "INVOICE_PAID",
            newStatus: "SHIPPED",
            changedById: adminUser.id,
            changedAt: new Date("2026-06-23T16:00:00"),
          },
        });
        await db.orderItemStatusLog.create({
          data: {
            orderItemId: item.id,
            oldStatus: "SHIPPED",
            newStatus: "RECEIVED",
            changedById: adminUser.id,
            changedAt: new Date("2026-06-24T12:00:00"),
          },
        });
      }
    }

    // Пятая заявка — свежая, только создана
    if (o5) {
      await db.orderItemStatusLog.create({
        data: {
          orderItemId: o5.items[0].id,
          oldStatus: null,
          newStatus: "ACCEPTED",
          changedById: adminUser.id,
          changedAt: new Date("2026-06-29T08:00:00"),
        },
      });
    }
  }

  const orderCount = [o1, o2, o3].filter(Boolean).length + (o4 ? 1 : 0) + (o5 ? 1 : 0);
  console.log(`  Заявок: ${orderCount}`);
  console.log("✅ Перезаполнение завершено");
}

main()
  .catch((e) => {
    console.error("❌ Ошибка:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
