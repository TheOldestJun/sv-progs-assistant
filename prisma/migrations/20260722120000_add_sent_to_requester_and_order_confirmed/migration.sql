-- Migration: add_sent_to_requester_and_order_confirmed
-- Adds SENT_TO_REQUESTER and ORDER_CONFIRMED statuses + OrderConfirmToken table

-- 1. Добавляем новые значения в enum OrderItemStatus
ALTER TABLE `OrderItem` MODIFY COLUMN `status` ENUM('ACCEPTED','INVOICE_RECEIVED','INVOICE_PAID','SHIPPED','RECEIVED','SENT_TO_REQUESTER','ORDER_CONFIRMED') NOT NULL DEFAULT 'ACCEPTED';

-- 2. Создаём таблицу OrderConfirmToken
CREATE TABLE `OrderConfirmToken` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `OrderConfirmToken_token_key` (`token`),
  INDEX `OrderConfirmToken_orderId_idx` (`orderId`),
  INDEX `OrderConfirmToken_token_idx` (`token`),
  CONSTRAINT `OrderConfirmToken_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
