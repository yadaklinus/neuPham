/*
  Warnings:

  - You are about to drop the column `customerId` on the `BalancePayment_online` table. All the data in the column will be lost.
  - You are about to drop the column `sale_onlineId` on the `BalancePayment_online` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `BalanceTransaction_online` table. All the data in the column will be lost.
  - You are about to drop the column `sale_onlineId` on the `PaymentMethod_online` table. All the data in the column will be lost.
  - You are about to drop the column `selectedCustomerId` on the `Quotation_online` table. All the data in the column will be lost.
  - You are about to drop the `Customer_online` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SaleItem_online` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sale_online` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BalancePayment_online" DROP CONSTRAINT "BalancePayment_online_customerId_fkey";

-- DropForeignKey
ALTER TABLE "BalancePayment_online" DROP CONSTRAINT "BalancePayment_online_sale_onlineId_fkey";

-- DropForeignKey
ALTER TABLE "BalanceTransaction_online" DROP CONSTRAINT "BalanceTransaction_online_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Customer_online" DROP CONSTRAINT "Customer_online_warehouses_onlineId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentMethod_online" DROP CONSTRAINT "PaymentMethod_online_sale_onlineId_fkey";

-- DropForeignKey
ALTER TABLE "Quotation_online" DROP CONSTRAINT "Quotation_online_selectedCustomerId_fkey";

-- DropForeignKey
ALTER TABLE "SaleItem_online" DROP CONSTRAINT "SaleItem_online_customer_onlineId_fkey";

-- DropForeignKey
ALTER TABLE "SaleItem_online" DROP CONSTRAINT "SaleItem_online_product_onlineId_fkey";

-- DropForeignKey
ALTER TABLE "SaleItem_online" DROP CONSTRAINT "SaleItem_online_sale_onlineId_fkey";

-- DropForeignKey
ALTER TABLE "SaleItem_online" DROP CONSTRAINT "SaleItem_online_warehouses_onlineId_fkey";

-- DropForeignKey
ALTER TABLE "Sale_online" DROP CONSTRAINT "Sale_online_customer_onlineId_fkey";

-- DropForeignKey
ALTER TABLE "Sale_online" DROP CONSTRAINT "Sale_online_warehouses_onlineId_fkey";

-- AlterTable
ALTER TABLE "BalancePayment_online" DROP COLUMN "customerId",
DROP COLUMN "sale_onlineId";

-- AlterTable
ALTER TABLE "BalanceTransaction_online" DROP COLUMN "customerId";

-- AlterTable
ALTER TABLE "PaymentMethod_online" DROP COLUMN "sale_onlineId";

-- AlterTable
ALTER TABLE "Quotation_online" DROP COLUMN "selectedCustomerId";

-- DropTable
DROP TABLE "Customer_online";

-- DropTable
DROP TABLE "SaleItem_online";

-- DropTable
DROP TABLE "Sale_online";
