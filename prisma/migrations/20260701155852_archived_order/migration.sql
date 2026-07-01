-- CreateTable
CREATE TABLE `archived_orders` (
    `id` VARCHAR(191) NOT NULL,
    `originalId` VARCHAR(191) NOT NULL,
    `requester_name` VARCHAR(191) NOT NULL,
    `order_date` DATE NOT NULL,
    `received_at` DATETIME(3) NOT NULL,
    `archived_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `items` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
