-- CreateEnum
CREATE TYPE "mode" AS ENUM ('dark', 'light');

-- CreateEnum
CREATE TYPE "role" AS ENUM ('admin', 'sales', 'purchase');

-- CreateEnum
CREATE TYPE "unit" AS ENUM ('kg', 'piece', 'liter', 'meter');

-- CreateEnum
CREATE TYPE "type" AS ENUM ('COMPANY', 'INDIVIDUAL', 'GOVERNMENT', 'NON_PROFIT', 'retal', 'wholesale');

-- CreateTable
CREATE TABLE "superAdmin" (
    "id" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "lastLogin" TIMESTAMP(3),
    "warehousesId" TEXT,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "superAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "role" NOT NULL,
    "warehousesId" TEXT,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "setting_id" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyEmail" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "websiteURL" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "defaultCurrency" TEXT NOT NULL,
    "taxRate" INTEGER NOT NULL,
    "mode" "mode" NOT NULL,
    "itermsPerPage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("setting_id")
);

-- CreateTable
CREATE TABLE "Warehouses" (
    "id" TEXT NOT NULL,
    "warehouseCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "selectedStudentId" TEXT,
    "diagnosis" TEXT,
    "symptoms" TEXT,
    "consultantNotes" TEXT,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "subTotal" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "amountPaid" DOUBLE PRECISION,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "warehousesId" TEXT,
    "invoiceNo" TEXT NOT NULL,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationItem" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "selectedPrice" DOUBLE PRECISION NOT NULL,
    "priceType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "instructions" TEXT,
    "discount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "warehousesId" TEXT,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "studentId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConsultationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "subTotal" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "amountPaid" DOUBLE PRECISION,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "warehousesId" TEXT,
    "referenceNo" TEXT NOT NULL,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "supplierId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "cost" DOUBLE PRECISION NOT NULL,
    "productName" TEXT,
    "selectedPrice" DOUBLE PRECISION NOT NULL,
    "priceType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "warehousesId" TEXT,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "purchaseId" TEXT,
    "customRetailPrice" DOUBLE PRECISION,
    "customWholesalePrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "matricNumber" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "bloodGroup" TEXT,
    "genotype" TEXT,
    "allergies" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "department" TEXT,
    "level" TEXT,
    "accountBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "warehousesId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceTransaction" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "reference" TEXT,
    "saleId" TEXT,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "warehouseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BalanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "warehousesId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "wholeSalePrice" DOUBLE PRECISION NOT NULL,
    "retailPrice" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "taxRate" INTEGER NOT NULL,
    "unit" "unit" NOT NULL,
    "description" TEXT NOT NULL,
    "warehousesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "warehousesId" TEXT,
    "consultationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptSettings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "receiptTitle" TEXT,
    "headerMessage" TEXT,
    "footerMessage" TEXT,
    "showLogo" BOOLEAN DEFAULT true,
    "logoUrl" TEXT,
    "showQrCode" BOOLEAN DEFAULT true,
    "qrCodeContent" TEXT DEFAULT 'website',
    "customQrContent" TEXT,
    "showCustomerInfo" BOOLEAN DEFAULT true,
    "showCashierInfo" BOOLEAN DEFAULT true,
    "showItemCodes" BOOLEAN DEFAULT true,
    "showItemDescriptions" BOOLEAN DEFAULT true,
    "showTaxBreakdown" BOOLEAN DEFAULT true,
    "showPaymentMethods" BOOLEAN DEFAULT true,
    "showBalance" BOOLEAN DEFAULT true,
    "showTimestamp" BOOLEAN DEFAULT true,
    "use24HourFormat" BOOLEAN DEFAULT false,
    "showItemNumbers" BOOLEAN DEFAULT true,
    "showRunningTotal" BOOLEAN DEFAULT false,
    "paperSize" TEXT DEFAULT '80mm',
    "fontSize" TEXT DEFAULT 'normal',
    "printDensity" TEXT DEFAULT 'normal',
    "lineSpacing" TEXT DEFAULT 'normal',
    "primaryColor" TEXT DEFAULT '#000000',
    "accentColor" TEXT DEFAULT '#666666',
    "fontFamily" TEXT DEFAULT 'monospace',
    "printCopyCount" INTEGER DEFAULT 1,
    "autoPrint" BOOLEAN DEFAULT false,
    "language" TEXT DEFAULT 'en',
    "currency" TEXT DEFAULT 'NGN',
    "currencySymbol" TEXT DEFAULT '₦',
    "currencyPosition" TEXT DEFAULT 'before',
    "warehousesId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReceiptSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalancePayment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "consultationId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "notes" TEXT,
    "warehousesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BalancePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "selectedStudentId" TEXT,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "subTotal" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "validUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "convertedToConsultationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "warehousesId" TEXT,
    "quotationNo" TEXT NOT NULL,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "selectedPrice" DOUBLE PRECISION NOT NULL,
    "priceType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "warehousesId" TEXT,
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stockTracking" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "patientId" TEXT,

    CONSTRAINT "stockTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspiciousActivity" (
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

    CONSTRAINT "suspiciousActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "superAdmin_email_key" ON "superAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_userName_key" ON "users"("userName");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouses_warehouseCode_key" ON "Warehouses"("warehouseCode");

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_invoiceNo_key" ON "Consultation"("invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_referenceNo_key" ON "Purchase"("referenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "Student_matricNumber_key" ON "Student"("matricNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptSettings_warehousesId_key" ON "ReceiptSettings"("warehousesId");

-- CreateIndex
CREATE UNIQUE INDEX "BalancePayment_receiptNo_key" ON "BalancePayment"("receiptNo");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotationNo_key" ON "Quotation"("quotationNo");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_warehousesId_fkey" FOREIGN KEY ("warehousesId") REFERENCES "Warehouses"("warehouseCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_selectedStudentId_fkey" FOREIGN KEY ("selectedStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_warehousesId_fkey" FOREIGN KEY ("warehousesId") REFERENCES "Warehouses"("warehouseCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationItem" ADD CONSTRAINT "ConsultationItem_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("invoiceNo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationItem" ADD CONSTRAINT "ConsultationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationItem" ADD CONSTRAINT "ConsultationItem_warehousesId_fkey" FOREIGN KEY ("warehousesId") REFERENCES "Warehouses"("warehouseCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationItem" ADD CONSTRAINT "ConsultationItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_warehousesId_fkey" FOREIGN KEY ("warehousesId") REFERENCES "Warehouses"("warehouseCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_warehousesId_fkey" FOREIGN KEY ("warehousesId") REFERENCES "Warehouses"("warehouseCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("referenceNo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_warehousesId_fkey" FOREIGN KEY ("warehousesId") REFERENCES "Warehouses"("warehouseCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouses"("warehouseCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_warehousesId_fkey" FOREIGN KEY ("warehousesId") REFERENCES "Warehouses"("warehouseCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_warehousesId_fkey" FOREIGN KEY ("warehousesId") REFERENCES "Warehouses"("warehouseCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_warehousesId_fkey" FOREIGN KEY ("warehousesId") REFERENCES "Warehouses"("warehouseCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("invoiceNo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptSettings" ADD CONSTRAINT "ReceiptSettings_warehousesId_fkey" FOREIGN KEY ("warehousesId") REFERENCES "Warehouses"("warehouseCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalancePayment" ADD CONSTRAINT "BalancePayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalancePayment" ADD CONSTRAINT "BalancePayment_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("invoiceNo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalancePayment" ADD CONSTRAINT "BalancePayment_warehousesId_fkey" FOREIGN KEY ("warehousesId") REFERENCES "Warehouses"("warehouseCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_selectedStudentId_fkey" FOREIGN KEY ("selectedStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_warehousesId_fkey" FOREIGN KEY ("warehousesId") REFERENCES "Warehouses"("warehouseCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("quotationNo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_warehousesId_fkey" FOREIGN KEY ("warehousesId") REFERENCES "Warehouses"("warehouseCode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockTracking" ADD CONSTRAINT "stockTracking_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockTracking" ADD CONSTRAINT "stockTracking_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockTracking" ADD CONSTRAINT "stockTracking_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockTracking" ADD CONSTRAINT "stockTracking_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspiciousActivity" ADD CONSTRAINT "suspiciousActivity_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspiciousActivity" ADD CONSTRAINT "suspiciousActivity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspiciousActivity" ADD CONSTRAINT "suspiciousActivity_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
