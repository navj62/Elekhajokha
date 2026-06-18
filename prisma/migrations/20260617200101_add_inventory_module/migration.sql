-- Add SOLD to PledgeStatus enum
ALTER TYPE "PledgeStatus" ADD VALUE IF NOT EXISTS 'SOLD';

-- Add SOLD to AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SOLD';

-- Add salePrice column to pledges table
ALTER TABLE "pledges" ADD COLUMN IF NOT EXISTS "salePrice" DECIMAL(12,2);

-- Create InventorySource enum
CREATE TYPE "InventorySource" AS ENUM ('PLEDGE_SALE', 'DIRECT_PURCHASE');

-- Create InventoryStatus enum
CREATE TYPE "InventoryStatus" AS ENUM ('IN_STOCK', 'SOLD');

-- Create inventory_items table
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sourceType" "InventorySource" NOT NULL,
    "sourcePledgeId" TEXT,
    "description" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "metalType" TEXT NOT NULL,
    "purity" DECIMAL(6,3),
    "weightGrams" DECIMAL(10,3) NOT NULL,
    "photoUrl" TEXT,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acquiredCost" DECIMAL(12,2) NOT NULL,
    "amountOwedAt" DECIMAL(12,2),
    "sellerName" TEXT,
    "sellerIdNum" TEXT,
    "status" "InventoryStatus" NOT NULL DEFAULT 'IN_STOCK',
    "soldAt" TIMESTAMP(3),
    "soldPrice" DECIMAL(12,2),
    "buyerName" TEXT,
    "buyerMobile" TEXT,
    "saleNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- Unique constraint enforcing one InventoryItem per Pledge
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_sourcePledgeId_key" UNIQUE ("sourcePledgeId");

-- Foreign keys
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_sourcePledgeId_fkey"
    FOREIGN KEY ("sourcePledgeId") REFERENCES "pledges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "inventory_items_ownerId_status_idx" ON "inventory_items"("ownerId", "status");
CREATE INDEX "inventory_items_ownerId_sourceType_idx" ON "inventory_items"("ownerId", "sourceType");
CREATE INDEX "inventory_items_ownerId_createdAt_idx" ON "inventory_items"("ownerId", "createdAt");
CREATE INDEX "inventory_items_sourcePledgeId_idx" ON "inventory_items"("sourcePledgeId");
