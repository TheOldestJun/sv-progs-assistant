-- Нормализация архива: вместо JSON-снимка items — таблицы archived_order_items
-- и archived_order_item_status_logs с полной историей смены статусов и датами.
-- Старые данные переносятся из колонки archived_orders.items (JSON) в новые таблицы
-- (позиции получают finalStatus = ORDER_CONFIRMED, история статусов для старых
-- заявок утрачена безвозвратно — она удалялась при архивации в прошлом).
-- ПРИМЕЧАНИЕ: бэкап-вставка выполняется ДО удаления колонки items.

-- CreateTable
CREATE TABLE `archived_order_items` (
    `id` VARCHAR(191) NOT NULL,
    `archivedOrderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `productTitle` VARCHAR(191) NOT NULL,
    `unitTitle` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `comment` VARCHAR(191) NULL,
    `finalStatus` ENUM('PENDING_DIRECTORATE', 'DIRECTORATE_APPROVED', 'ACCEPTED', 'REQUEST_SENT', 'INVOICE_RECEIVED', 'INVOICE_PAID', 'SHIPPED', 'RECEIVED', 'SENT_TO_REQUESTER', 'ORDER_CONFIRMED') NOT NULL,

    INDEX `archived_order_items_archivedOrderId_idx`(`archivedOrderId`),
    INDEX `archived_order_items_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `archived_order_item_status_logs` (
    `id` VARCHAR(191) NOT NULL,
    `archivedItemId` VARCHAR(191) NOT NULL,
    `oldStatus` ENUM('PENDING_DIRECTORATE', 'DIRECTORATE_APPROVED', 'ACCEPTED', 'REQUEST_SENT', 'INVOICE_RECEIVED', 'INVOICE_PAID', 'SHIPPED', 'RECEIVED', 'SENT_TO_REQUESTER', 'ORDER_CONFIRMED') NULL,
    `newStatus` ENUM('PENDING_DIRECTORATE', 'DIRECTORATE_APPROVED', 'ACCEPTED', 'REQUEST_SENT', 'INVOICE_RECEIVED', 'INVOICE_PAID', 'SHIPPED', 'RECEIVED', 'SENT_TO_REQUESTER', 'ORDER_CONFIRMED') NOT NULL,
    `changedById` VARCHAR(191) NULL,
    `changedByName` VARCHAR(191) NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `archived_order_item_status_logs_archivedItemId_idx`(`archivedItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `archived_order_items` ADD CONSTRAINT `archived_order_items_archivedOrderId_fkey` FOREIGN KEY (`archivedOrderId`) REFERENCES `archived_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `archived_order_item_status_logs` ADD CONSTRAINT `archived_order_item_status_logs_archivedItemId_fkey` FOREIGN KEY (`archivedItemId`) REFERENCES `archived_order_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: перенос старых данных из archived_orders.items в archived_order_items
INSERT INTO `archived_order_items` (`id`, `archivedOrderId`, `productId`, `productTitle`, `unitTitle`, `quantity`, `comment`, `finalStatus`)
SELECT
  UUID(),
  a.`id`,
  p.`id`,
  it.`product`,
  it.`unit`,
  it.`quantity`,
  it.`comment`,
  'ORDER_CONFIRMED'
FROM `archived_orders` a
JOIN JSON_TABLE(a.`items`, '$[*]' COLUMNS (
  `product` VARCHAR(255) COLLATE utf8mb4_unicode_ci PATH '$.product',
  `unit` VARCHAR(255) COLLATE utf8mb4_unicode_ci PATH '$.unit',
  `quantity` DOUBLE PATH '$.quantity',
  `comment` TEXT COLLATE utf8mb4_unicode_ci PATH '$.comment'
)) AS it
LEFT JOIN `Product` p ON p.`title` = it.`product`;

-- Индексы archived_orders, которые были в схеме, но отсутствовали в реальной БД
CREATE INDEX `archived_orders_requester_name_idx` ON `archived_orders`(`requester_name`);
CREATE INDEX `archived_orders_archived_at_idx` ON `archived_orders`(`archived_at`);
CREATE INDEX `archived_orders_createdById_idx` ON `archived_orders`(`createdById`);

-- Переименование поддерживающих индексов Order под ожидаемые Prisma имена (_idx вместо _fkey).
-- Сначала снимаем FK (индекс используется FK), пересоздаём индекс и возвращаем FK.
ALTER TABLE `Order` DROP FOREIGN KEY `Order_createdById_fkey`;
DROP INDEX `Order_createdById_fkey` ON `Order`;
CREATE INDEX `Order_createdById_idx` ON `Order`(`createdById`);
ALTER TABLE `Order` ADD CONSTRAINT `Order_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Order` DROP FOREIGN KEY `Order_requesterId_fkey`;
DROP INDEX `Order_requesterId_fkey` ON `Order`;
CREATE INDEX `Order_requesterId_idx` ON `Order`(`requesterId`);
ALTER TABLE `Order` ADD CONSTRAINT `Order_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `Requester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: удаляем устаревшую JSON-колонку (данные уже перенесены выше)
ALTER TABLE `archived_orders` DROP COLUMN `items`;
