-- Синхронизация истории миграций с реальной БД (расхождение из-за db push в прошлом).
-- Реальная БД уже содержит Message и статус REQUEST_SENT, поэтому эта миграция
-- записывается через `prisma migrate resolve --applied` (НЕ выполняется на реальной БД)
-- и служит для того, чтобы воспроизведение истории на чистой БД давало текущую схему.

-- AlterEnum: добавить REQUEST_SENT в OrderItem.status
ALTER TABLE `OrderItem` MODIFY `status` enum('PENDING_DIRECTORATE','DIRECTORATE_APPROVED','ACCEPTED','REQUEST_SENT','INVOICE_RECEIVED','INVOICE_PAID','SHIPPED','RECEIVED','SENT_TO_REQUESTER','ORDER_CONFIRMED') NOT NULL DEFAULT 'PENDING_DIRECTORATE';

-- AlterEnum: добавить REQUEST_SENT в OrderItemStatusLog.oldStatus / newStatus
ALTER TABLE `OrderItemStatusLog` MODIFY `oldStatus` enum('PENDING_DIRECTORATE','DIRECTORATE_APPROVED','ACCEPTED','REQUEST_SENT','INVOICE_RECEIVED','INVOICE_PAID','SHIPPED','RECEIVED','SENT_TO_REQUESTER','ORDER_CONFIRMED') NULL,
    MODIFY `newStatus` enum('PENDING_DIRECTORATE','DIRECTORATE_APPROVED','ACCEPTED','REQUEST_SENT','INVOICE_RECEIVED','INVOICE_PAID','SHIPPED','RECEIVED','SENT_TO_REQUESTER','ORDER_CONFIRMED') NOT NULL;

-- CreateTable Message (в реальной БД уже существует — создана в обход миграций)
CREATE TABLE `Message` (
    `id` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `receiverId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `readAt` DATETIME(3) NULL,

    INDEX `Message_receiverId_idx`(`receiverId` ASC),
    INDEX `Message_receiverId_readAt_idx`(`receiverId` ASC, `readAt` ASC),
    INDEX `Message_senderId_idx`(`senderId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
