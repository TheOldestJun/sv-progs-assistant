-- CreateTable
CREATE TABLE `Dish` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('SOUP', 'GARNISH', 'MEAT', 'SALAD', 'BAKERY', 'DRINK') NOT NULL DEFAULT 'SOUP',
    `price` DOUBLE NOT NULL DEFAULT 0,
    `description` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Dish_name_key`(`name`),
    INDEX `Dish_type_idx`(`type`),
    INDEX `Dish_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
