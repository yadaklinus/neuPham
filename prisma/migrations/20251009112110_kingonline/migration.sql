/*
  Warnings:

  - You are about to drop the `stock_tracking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `suspicious_activities` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "stock_tracking" DROP CONSTRAINT "stock_tracking_patientId_fkey";

-- DropForeignKey
ALTER TABLE "stock_tracking" DROP CONSTRAINT "stock_tracking_productId_fkey";

-- DropForeignKey
ALTER TABLE "stock_tracking" DROP CONSTRAINT "stock_tracking_staffId_fkey";

-- DropForeignKey
ALTER TABLE "stock_tracking" DROP CONSTRAINT "stock_tracking_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "suspicious_activities" DROP CONSTRAINT "suspicious_activities_productId_fkey";

-- DropForeignKey
ALTER TABLE "suspicious_activities" DROP CONSTRAINT "suspicious_activities_staffId_fkey";

-- DropForeignKey
ALTER TABLE "suspicious_activities" DROP CONSTRAINT "suspicious_activities_warehouseId_fkey";

-- DropTable
DROP TABLE "stock_tracking";

-- DropTable
DROP TABLE "suspicious_activities";

-- CreateTable
CREATE TABLE "stockTracking_online" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "patientId" TEXT,

    CONSTRAINT "stockTracking_online_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspiciousActivity_online" (
    "id" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN DEFAULT false,
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "staffId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,

    CONSTRAINT "suspiciousActivity_online_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "stockTracking_online" ADD CONSTRAINT "stockTracking_online_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product_online"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockTracking_online" ADD CONSTRAINT "stockTracking_online_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouses_online"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockTracking_online" ADD CONSTRAINT "stockTracking_online_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "users_online"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockTracking_online" ADD CONSTRAINT "stockTracking_online_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Student_online"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspiciousActivity_online" ADD CONSTRAINT "suspiciousActivity_online_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "users_online"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspiciousActivity_online" ADD CONSTRAINT "suspiciousActivity_online_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product_online"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspiciousActivity_online" ADD CONSTRAINT "suspiciousActivity_online_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouses_online"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
