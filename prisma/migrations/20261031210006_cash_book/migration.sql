-- CreateEnum
CREATE TYPE "CashDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CashMode" AS ENUM ('CASH', 'UPI', 'BANK');

-- CreateEnum
CREATE TYPE "CashKind" AS ENUM ('PLEDGE_CREATED', 'PLEDGE_RELEASED', 'PLEDGE_SOLD', 'INVENTORY_BOUGHT', 'INVENTORY_SOLD', 'REPAYMENT', 'TOPUP', 'REVERSAL', 'MANUAL');

-- CreateTable
CREATE TABLE "cash_days" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "carriedOpening" DECIMAL(14,2),
    "openingOverride" DECIMAL(14,2),
    "countedCash" DECIMAL(14,2),
    "countedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "direction" "CashDirection" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "mode" "CashMode" NOT NULL DEFAULT 'CASH',
    "kind" "CashKind" NOT NULL,
    "partyName" TEXT,
    "customerId" TEXT,
    "pledgeId" TEXT,
    "inventoryItemId" TEXT,
    "transactionId" TEXT,
    "reversesEntryId" TEXT,
    "eventDate" DATE,
    "note" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_days_userId_date_key" ON "cash_days"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "cash_entries_transactionId_key" ON "cash_entries"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_entries_reversesEntryId_key" ON "cash_entries"("reversesEntryId");

-- CreateIndex
CREATE INDEX "cash_entries_customerId_idx" ON "cash_entries"("customerId");

-- CreateIndex
CREATE INDEX "cash_entries_userId_date_createdAt_idx" ON "cash_entries"("userId", "date", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cash_entries_pledgeId_kind_key" ON "cash_entries"("pledgeId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "cash_entries_inventoryItemId_kind_key" ON "cash_entries"("inventoryItemId", "kind");

-- AddForeignKey
ALTER TABLE "cash_days" ADD CONSTRAINT "cash_days_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_reversesEntryId_fkey" FOREIGN KEY ("reversesEntryId") REFERENCES "cash_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
