-- AlterEnum: add REQUESTER to Role enum
ALTER TABLE `UserRole` MODIFY `role` ENUM('ADMIN', 'HEAD_OF_SUPPLY', 'SUPPLY_DEPT', 'WAREHOUSE', 'REQUESTER') NOT NULL;

-- AlterTable: add userId to Requester (links to User for REQUESTER role)
ALTER TABLE `Requester` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Requester` ADD UNIQUE INDEX `Requester_userId_key`(`userId`);

-- AlterTable: add createdById to Order (tracks who created the order)
ALTER TABLE `Order` ADD COLUMN `createdById` VARCHAR(191) NULL;

-- AlterTable: add createdById to archived_orders (for filtering by user)
ALTER TABLE `archived_orders` ADD COLUMN `createdById` VARCHAR(191) NULL;

-- AddForeignKey for Requester.userId -> User.id
ALTER TABLE `Requester` ADD CONSTRAINT `Requester_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for Order.createdById -> User.id
ALTER TABLE `Order` ADD CONSTRAINT `Order_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
