/*
  Warnings:

  - You are about to drop the column `createdBy` on the `Order` table. All the data in the column will be lost.
  - Added the required column `requesterId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Order` DROP COLUMN `createdBy`,
    ADD COLUMN `requesterId` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `Requester` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `Requester`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
