-- CreateTable
CREATE TABLE `OrderItemStatusLog` (
    `id` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,
    `oldStatus` ENUM('ACCEPTED', 'INVOICE_RECEIVED', 'INVOICE_PAID', 'SHIPPED', 'RECEIVED') NULL,
    `newStatus` ENUM('ACCEPTED', 'INVOICE_RECEIVED', 'INVOICE_PAID', 'SHIPPED', 'RECEIVED') NOT NULL,
    `changedById` VARCHAR(191) NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OrderItemStatusLog` ADD CONSTRAINT `OrderItemStatusLog_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItemStatusLog` ADD CONSTRAINT `OrderItemStatusLog_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
