-- CreateIndex
CREATE INDEX `OrderItem_orderId_idx` ON `OrderItem`(`orderId`);

-- CreateIndex
CREATE INDEX `OrderItem_productId_idx` ON `OrderItem`(`productId`);

-- CreateIndex
CREATE INDEX `OrderItem_unitId_idx` ON `OrderItem`(`unitId`);

-- CreateIndex
CREATE INDEX `OrderItemStatusLog_changedById_idx` ON `OrderItemStatusLog`(`changedById`);

-- CreateIndex
CREATE INDEX `OrderItemStatusLog_orderItemId_idx` ON `OrderItemStatusLog`(`orderItemId`);
