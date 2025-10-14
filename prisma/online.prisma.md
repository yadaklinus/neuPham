// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

// Looking for ways to speed up your queries, or scale easily with your serverless or edge functions?
// Try Prisma Accelerate: https://pris.ly/cli/accelerate-init

generator client_ {
  provider = "prisma-client-js"
  output   = "./generated/online"
}

// Offline database (PostgreSQL) - Main database
datasource db_ {
  provider = "postgresql"
  url      = env("DATABASE_URL_ONLINE")
}

enum mode_online {
  dark
  light
}

enum role_online {
  admin
  sales
  purchase
}

enum unit_online {
  kg
  piece
  liter
  meter
}

enum type_online {
  COMPANY
  INDIVIDUAL
  GOVERNMENT
  NON_PROFIT
  retal
  wholesale
}

model superAdmin_online {
  id           String    @id @default(uuid())
  userName     String
  email        String    @unique
  password     String
  role         String
  lastLogin    DateTime?
  warehousesId String?
  sync         Boolean   @default(false) // Sync field
  syncedAt     DateTime? // When last synced
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  isDeleted    Boolean   @default(false)
}

model users_online {
  id                    String                      @id @default(uuid())
  email                 String
  userName              String                      @unique
  phoneNumber           String
  password              String
  role                  role_online
  lastLogin             DateTime?
  createdAt             DateTime                    @default(now())
  updatedAt             DateTime                    @updatedAt
  sync                  Boolean                     @default(false) // Sync field
  syncedAt              DateTime? // When last synced
  Warehouses_online     Warehouses_online?          @relation(fields: [warehouses_onlineId], references: [warehouseCode])
  warehouses_onlineId   String?
  isDeleted             Boolean                     @default(false)
  // Relations for tracking
  stockTracking         stockTracking_online[]
  suspiciousActivity    suspiciousActivity_online[]
}

model Settings_online {
  setting_id    Int         @id
  companyName   String
  companyEmail  String
  phoneNumber   String
  websiteURL    String
  address       String
  logoUrl       String
  defaultCurrency String
  taxRate       Int
  mode          mode_online
  itemsPerPage  Int
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  sync          Boolean     @default(false) // Sync field
  syncedAt      DateTime? // When last synced
  isDeleted     Boolean     @default(false)
}

model Warehouses_online {
  id                 String                        @id @default(uuid())
  warehouseCode      String                        @unique
  name               String
  phoneNumber        String
  email              String
  description        String?
  address            String
  users              users_online[]
  products           Product_online[]
  student            Student_online[]
  consultationItem   ConsultationItem_online[]
  consultation       Consultation_online[]
  paymentMethod      PaymentMethod_online[]
  purchase           Purchase_online[]
  purchaseItem       PurchaseItem_online[]
  supplier           Supplier_online[]
  receiptSettings    ReceiptSettings_online?
  balancePayment     BalancePayment_online[]
  quotation          Quotation_online[]
  balanceTransaction BalanceTransaction_online[]
  quotationItem      QuotationItem_online[]
  sync               Boolean                       @default(false) // Sync field
  syncedAt           DateTime? // When last synced
  isDeleted          Boolean                       @default(false)
  // Relations for tracking
  stockTracking      stockTracking_online[]
  suspiciousActivity suspiciousActivity_online[]
}

model Consultation_online {
  id                 String           @id @default(cuid())
  consultationItems  ConsultationItem_online[]
  selectedStudentId  String? // reference to Student
  selectedStudent    Student_online?         @relation(fields: [selectedStudentId], references: [id])
  diagnosis          String?          // What is wrong with the student
  symptoms           String?          // Symptoms described
  consultantNotes    String?          // Additional notes from consultant
  taxRate            Float
  subTotal           Float
  notes              String?
  amountPaid         Float?
  grandTotal         Float
  paidAmount         Float
  balance            Float
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  Warehouses    Warehouses_online? @relation(fields: [warehousesId], references: [warehouseCode])
  warehousesId  String?
  invoiceNo          String           @unique
  paymentMethod      PaymentMethod_online[]
  balancePayment     BalancePayment_online[]
  sync               Boolean          @default(false) // Sync field
  syncedAt           DateTime? // When last synced
  isDeleted          Boolean          @default(false)
}

model ConsultationItem_online {
  id            String      @id @default(cuid())
  consultationId String?
  consultation  Consultation_online? @relation(fields: [consultationId], references: [invoiceNo])
  productId     String?
  product       Product_online?    @relation(fields: [productId], references: [id])
  productName   String
  cost          Float
  selectedPrice Float
  priceType     String
  quantity      Int
  dosage        String?     // How the medicine should be taken
  frequency     String?     // How often to take (e.g., "twice daily", "as needed")
  duration      String?     // How long to take (e.g., "5 days", "until finished")
  instructions  String?     // Additional instructions
  discount      Float
  total         Float
  profit        Float
  Warehouses    Warehouses_online? @relation(fields: [warehousesId], references: [warehouseCode])
  warehousesId  String?
  sync          Boolean     @default(false) // Sync field
  syncedAt      DateTime? // When last synced
  Student       Student_online?    @relation(fields: [studentId], references: [id])
  studentId     String?
  isDeleted     Boolean     @default(false)
}

model Purchase_online {
  id                  String                @id @default(cuid())
  purchaseItem        PurchaseItem_online[]
  taxRate             Float
  subTotal            Float
  notes               String?
  amountPaid          Float?
  grandTotal          Float
  paidAmount          Float
  balance             Float
  createdAt           DateTime              @default(now())
  updatedAt           DateTime              @updatedAt
  referenceNo         String                @unique
  sync                Boolean               @default(false) // Sync field
  syncedAt            DateTime?
  Warehouses_online   Warehouses_online?    @relation(fields: [warehouses_onlineId], references: [warehouseCode])
  warehouses_onlineId String?
  Supplier_online     Supplier_online?      @relation(fields: [supplier_onlineId], references: [id])
  supplier_onlineId   String?
  isDeleted           Boolean               @default(false)
}

model PurchaseItem_online {
  id                   String             @id @default(cuid())
  productId            String?
  cost                 Float
  selectedPrice        Float
  productName          String?
  priceType            String
  quantity             Int
  discount             Float
  total                Float
  profit               Float
  sync                 Boolean            @default(false) // Sync field
  syncedAt             DateTime? // When last synced
  customRetailPrice    Float?
  customWholesalePrice Float?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  Warehouses_online    Warehouses_online? @relation(fields: [warehouses_onlineId], references: [warehouseCode])
  warehouses_onlineId  String?
  Purchase_online      Purchase_online?   @relation(fields: [purchase_onlineId], references: [referenceNo])
  purchase_onlineId    String?
  Product_online       Product_online?    @relation(fields: [product_onlineId], references: [id])
  product_onlineId     String?
  isDeleted            Boolean            @default(false)
}

model Student_online {
  id                    String                      @id @default(uuid())
  name                  String
  matricNumber          String                      @unique
  email                 String?
  phone                 String
  address               String?
  bloodGroup            String? // A+, A-, B+, B-, AB+, AB-, O+, O-
  genotype              String? // AA, AS, SS
  allergies             String? // Comma-separated list of allergies
  emergencyContact      String?
  emergencyPhone        String?
  department            String? // Student's department/faculty
  level                 String? // Student's level (100, 200, 300, etc.)
  accountBalance        Float                       @default(0) // Add this field
  Warehouses            Warehouses_online?          @relation(fields: [warehousesId], references: [warehouseCode])
  warehousesId          String
  Consultation          Consultation_online[]
  consultationItem      ConsultationItem_online[]
  balancePayment        BalancePayment_online[]
  balanceTransaction    BalanceTransaction_online[] // Add this relation
  quotation             Quotation_online[]
  createdAt             DateTime                    @default(now())
  updatedAt             DateTime                    @updatedAt
  sync                  Boolean                     @default(false) // Sync field
  syncedAt              DateTime? // When last synced
  isDeleted             Boolean                     @default(false)
  // Relation for tracking
  stockTracking         stockTracking_online[]
}

model BalanceTransaction_online {
  id          String             @id @default(uuid())
  studentId   String? // Made optional
  student     Student_online?    @relation(fields: [studentId], references: [id])
  amount      Float
  type        String // CREDIT or DEBIT
  description String
  paymentMethod String? // cash, card, bank_transfer, mobile_money
  reference   String? // Transaction reference
  saleId      String? // If related to a sale
  balanceAfter Float // Balance after this transaction
  warehouseId String?
  warehouses  Warehouses_online? @relation(fields: [warehouseId], references: [warehouseCode])
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  sync        Boolean            @default(false)
  syncedAt    DateTime?
  isDeleted   Boolean            @default(false)
}

model Supplier_online {
  id                  String             @id @default(uuid())
  name                String
  type                String
  companyName         String?
  email               String
  address             String
  phone               String
  purchase            Purchase_online[]
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  sync                Boolean            @default(false) // Sync field
  syncedAt            DateTime? // When last synced
  Warehouses_online   Warehouses_online? @relation(fields: [warehouses_onlineId], references: [warehouseCode])
  warehouses_onlineId String?
  isDeleted           Boolean            @default(false)
}

model Product_online {
  id                    String                      @id @default(uuid())
  name                  String
  barcode               String
  wholeSalePrice        Float
  retailPrice           Float
  cost                  Float
  quantity              Int
  taxRate               Int
  unit                  unit_online
  description           String
  consultationItem      ConsultationItem_online[]
  purchaseItem          PurchaseItem_online[]
  quotationItem         QuotationItem_online[]
  createdAt             DateTime                    @default(now())
  updatedAt             DateTime                    @updatedAt
  sync                  Boolean                     @default(false) // Sync field
  syncedAt              DateTime? // When last synced
  Warehouses_online     Warehouses_online?          @relation(fields: [warehouses_onlineId], references: [warehouseCode])
  warehouses_onlineId   String?
  isDeleted             Boolean                     @default(false)
  // Relations for tracking
  stockTracking         stockTracking_online[]
  suspiciousActivity    suspiciousActivity_online[]
}

model PaymentMethod_online {
  id                    String               @id @default(uuid())
  method                String
  amount                Int
  createdAt             DateTime             @default(now())
  updatedAt             DateTime             @updatedAt
  sync                  Boolean              @default(false) // Sync field
  syncedAt              DateTime? // When last synced
  Warehouses_online     Warehouses_online?   @relation(fields: [warehouses_onlineId], references: [warehouseCode])
  warehouses_onlineId   String?
  Consultation_online   Consultation_online? @relation(fields: [consultation_onlineId], references: [invoiceNo])
  consultation_onlineId String?
  isDeleted             Boolean              @default(false)
}

model ReceiptSettings_online {
  id                   String             @id @default(uuid())
  companyName          String
  businessName         String
  address              String
  city                 String
  state                String
  country              String
  phone                String
  email                String
  website              String
  receiptTitle         String?
  headerMessage        String?
  footerMessage        String?
  showLogo             Boolean?           @default(true)
  logoUrl              String?
  showQrCode           Boolean?           @default(true)
  qrCodeContent        String?            @default("website")
  customQrContent      String?
  showCustomerInfo     Boolean?           @default(true)
  showCashierInfo      Boolean?           @default(true)
  showItemCodes        Boolean?           @default(true)
  showItemDescriptions Boolean?           @default(true)
  showTaxBreakdown     Boolean?           @default(true)
  showPaymentMethods   Boolean?           @default(true)
  showBalance          Boolean?           @default(true)
  showTimestamp        Boolean?           @default(true)
  use24HourFormat      Boolean?           @default(false)
  showItemNumbers      Boolean?           @default(true)
  showRunningTotal     Boolean?           @default(false)
  paperSize            String?            @default("80mm")
  fontSize             String?            @default("normal")
  printDensity         String?            @default("normal")
  lineSpacing          String?            @default("normal")
  primaryColor         String?            @default("#000000")
  accentColor          String?            @default("#666666")
  fontFamily           String?            @default("monospace")
  printCopyCount       Int?               @default(1)
  autoPrint            Boolean?           @default(false)
  language             String?            @default("en")
  currency             String?            @default("NGN")
  currencySymbol       String?            @default("₦")
  currencyPosition     String?            @default("before")
  Warehouses_online    Warehouses_online? @relation(fields: [warehouses_onlineId], references: [warehouseCode])
  warehouses_onlineId  String             @unique
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  sync                 Boolean            @default(false) // Sync field
  syncedAt             DateTime? // When last synced
  isDeleted            Boolean            @default(false)
}

model BalancePayment_online {
  id             String               @id @default(uuid())
  studentId      String? // Made optional
  student        Student_online?      @relation(fields: [studentId], references: [id])
  consultationId String?
  consultation   Consultation_online? @relation(fields: [consultationId], references: [invoiceNo])
  amount         Float
  paymentMethod  String
  receiptNo      String               @unique
  notes          String?
  warehousesId   String?
  warehouses     Warehouses_online?   @relation(fields: [warehousesId], references: [warehouseCode])
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt
  sync           Boolean              @default(false) // Sync field
  syncedAt       DateTime? // When last synced
  isDeleted      Boolean              @default(false)
}

model Quotation_online {
  id                          String                 @id @default(cuid())
  quotationItems              QuotationItem_online[]
  selectedStudentId           String? // reference to Student
  selectedStudent             Student_online?        @relation(fields: [selectedStudentId], references: [id])
  taxRate                     Float
  subTotal                    Float
  notes                       String?
  grandTotal                  Float
  validUntil                  DateTime? // Quotation expiry date
  status                      String                 @default("pending") // pending, accepted, rejected, converted
  convertedToConsultationId   String? // If converted to consultation, reference to Consultation
  createdAt                   DateTime               @default(now())
  updatedAt                   DateTime               @updatedAt
  warehousesId                String?
  warehouses                  Warehouses_online?     @relation(fields: [warehousesId], references: [warehouseCode])
  quotationNo                 String                 @unique
  sync                        Boolean                @default(false) // Sync field
  syncedAt                    DateTime? // When last synced
  isDeleted                   Boolean                @default(false)
}

model QuotationItem_online {
  id            String             @id @default(cuid())
  quotationId   String?
  quotation     Quotation_online?  @relation(fields: [quotationId], references: [quotationNo])
  productId     String?
  product       Product_online?    @relation(fields: [productId], references: [id])
  productName   String
  cost          Float
  selectedPrice Float
  priceType     String
  quantity      Int
  discount      Float
  total         Float
  warehouses    Warehouses_online? @relation(fields: [warehousesId], references: [warehouseCode])
  warehousesId  String?
  sync          Boolean            @default(false) // Sync field
  syncedAt      DateTime? // When last synced
  isDeleted     Boolean            @default(false)
}

// Model for tracking stock movements, corrected to fit the new schema
model stockTracking_online {
  id            String    @id @default(cuid())
  action        String // 'dispensed', 'received', 'adjusted', 'transferred'
  quantity      Int
  previousStock Int
  newStock      Int
  reason        String
  timestamp     DateTime  @default(now())
  ipAddress     String
  userAgent     String

  // Relationships (linking to new models)
  productId String
  product   Product_online @relation(fields: [productId], references: [id])

  warehouseId String
  warehouse   Warehouses_online @relation(fields: [warehouseId], references: [id])

  staffId   String
  staff     users_online   @relation(fields: [staffId], references: [id])

  patientId String?
  patient   Student_online?  @relation(fields: [patientId], references: [id])
}

// Model for logging suspicious activities, corrected to fit the new schema
model suspiciousActivity_online {
  id           String    @id @default(cuid())
  activityType String // e.g., 'excessive_dispensing'
  description  String
  severity     String // 'low', 'medium', 'high'
  timestamp    DateTime  @default(now())

  // Resolution fields based on new API logic
  resolved     Boolean?  @default(false)
  resolution   String?
  resolvedBy   String?
  resolvedAt   DateTime?

  // Relationships (linking to new models)
  staffId   String
  staff     users_online      @relation(fields: [staffId], references: [id])

  productId String
  product   Product_online    @relation(fields: [productId], references: [id])

  warehouseId String
  warehouse Warehouses_online @relation(fields: [warehouseId], references: [id])
}

