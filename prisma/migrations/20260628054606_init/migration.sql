-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST', 'TOPUP');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'RELEASED', 'DELETED', 'RECALCULATED', 'SOLD');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('halfyearly', 'yearly');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trial', 'created', 'active', 'halted', 'expired');

-- CreateEnum
CREATE TYPE "MetalType" AS ENUM ('GOLD', 'SILVER');

-- CreateEnum
CREATE TYPE "PledgeStatus" AS ENUM ('ACTIVE', 'RELEASED', 'OVERDUE', 'SOLD');

-- CreateEnum
CREATE TYPE "CompoundingDuration" AS ENUM ('MONTHLY', 'HALFYEARLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('SAFE', 'WATCH', 'AT_RISK', 'UNDERWATER');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('TIER_CHANGE', 'CRITICAL', 'INFO');

-- CreateEnum
CREATE TYPE "InventorySource" AS ENUM ('PLEDGE_SALE', 'DIRECT_PURCHASE');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('IN_STOCK', 'SOLD');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "mobile" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "shopName" TEXT,
    "address" TEXT,
    "gender" "Gender",
    "profileImageUrl" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'expired',
    "subscriptionEndDate" TIMESTAMP(3),
    "razorpaySubscriptionId" TEXT,
    "subscriptionPlan" "SubscriptionPlan",
    "razorpayPaymentId" TEXT,
    "subscriptionCreatedAt" TIMESTAMP(3),
    "lastGraceExpiredAt" TIMESTAMP(3),
    "hadTrial" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerTerms" TEXT,
    "shopownerTerms" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "mobile" TEXT,
    "viewToken" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isPortalBlocked" BOOLEAN NOT NULL DEFAULT false,
    "idProofImg" TEXT,
    "customerImg" TEXT,
    "aadharNo" TEXT,
    "remark" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gender" "Gender",

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pledges" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "pledgeDate" TIMESTAMP(3) NOT NULL,
    "loanAmount" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL,
    "compoundingDuration" "CompoundingDuration" NOT NULL,
    "allowCompounding" BOOLEAN NOT NULL DEFAULT true,
    "itemPhoto" TEXT,
    "remark" TEXT,
    "durationMonths" DECIMAL(6,2),
    "status" "PledgeStatus" NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "netWeightOfGold" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "netWeightOfSilver" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "totalInterest" DECIMAL(12,2),
    "receivableAmount" DECIMAL(12,2),
    "calculationVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastCalculatedLtv" DECIMAL(8,2),
    "lastRiskTier" "RiskTier",
    "lastEvaluatedAt" TIMESTAMP(3),
    "lastAmountOwed" DECIMAL(14,2),
    "lastMarketValue" DECIMAL(14,2),
    "salePrice" DECIMAL(12,2),

    CONSTRAINT "pledges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pledge_item_types" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pledge_item_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pledge_items" (
    "id" TEXT NOT NULL,
    "pledgeId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "metalType" "MetalType" NOT NULL,
    "itemName" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "grossWeight" DECIMAL(10,3) NOT NULL,
    "netWeight" DECIMAL(10,3) NOT NULL,
    "purity" DECIMAL(5,2) NOT NULL,
    "netWeightOfMetal" DECIMAL(10,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pledge_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pledge_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pledgeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "oldTier" "RiskTier",
    "newTier" "RiskTier" NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pledge_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pledge_audits" (
    "id" TEXT NOT NULL,
    "pledgeId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "principal" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL,
    "allowCompounding" BOOLEAN NOT NULL,
    "compoundingDuration" "CompoundingDuration" NOT NULL,
    "calculationVersion" INTEGER NOT NULL,
    "durationMonths" DECIMAL(6,2),
    "netWeightOfGold" DECIMAL(10,3) NOT NULL,
    "netWeightOfSilver" DECIMAL(10,3) NOT NULL,
    "goldPricePerGram" DECIMAL(10,2),
    "silverPricePerGram" DECIMAL(10,2),
    "marketValueAtRelease" DECIMAL(12,2),
    "ltvAtRelease" DECIMAL(5,2),
    "totalInterest" DECIMAL(12,2),
    "receivableAmount" DECIMAL(12,2),
    "releaseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pledge_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetalPrice" (
    "id" TEXT NOT NULL,
    "metal" "MetalType" NOT NULL,
    "usdPerOunce" DECIMAL(12,4) NOT NULL,
    "inrPerGram" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetalPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "pledgeId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalLoanAmount" DECIMAL(14,2) NOT NULL,
    "totalAmountOwed" DECIMAL(14,2) NOT NULL,
    "totalInterestOwed" DECIMAL(14,2) NOT NULL,
    "totalMarketValue" DECIMAL(14,2) NOT NULL,
    "goldPricePerGram" DECIMAL(10,2) NOT NULL,
    "silverPricePerGram" DECIMAL(10,2) NOT NULL,
    "overallLtv" DECIMAL(5,2) NOT NULL,
    "totalGoldWeight" DECIMAL(14,3) NOT NULL,
    "totalSilverWeight" DECIMAL(14,3) NOT NULL,
    "totalPledges" INTEGER NOT NULL,
    "activePledges" INTEGER NOT NULL,
    "releasedPledges" INTEGER NOT NULL,
    "overduePledges" INTEGER NOT NULL,
    "safePledges" INTEGER NOT NULL,
    "watchPledges" INTEGER NOT NULL,
    "atRiskPledges" INTEGER NOT NULL,
    "underwaterPledges" INTEGER NOT NULL,
    "mtdNewPledges" INTEGER NOT NULL DEFAULT 0,
    "mtdReleasedPledges" INTEGER NOT NULL DEFAULT 0,
    "mtdLoanAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
    "acquiredMetalRate" DECIMAL(10,2),
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

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkUserId_key" ON "users"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "users_razorpaySubscriptionId_key" ON "users"("razorpaySubscriptionId");

-- CreateIndex
CREATE INDEX "users_razorpaySubscriptionId_idx" ON "users"("razorpaySubscriptionId");

-- CreateIndex
CREATE INDEX "users_subscriptionStatus_isActive_idx" ON "users"("subscriptionStatus", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "customers_viewToken_key" ON "customers"("viewToken");

-- CreateIndex
CREATE INDEX "customers_userId_deletedAt_idx" ON "customers"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "pledges_status_createdAt_idx" ON "pledges"("status", "createdAt");

-- CreateIndex
CREATE INDEX "pledges_customerId_status_idx" ON "pledges"("customerId", "status");

-- CreateIndex
CREATE INDEX "pledge_item_types_userId_idx" ON "pledge_item_types"("userId");

-- CreateIndex
CREATE INDEX "pledge_item_types_isDefault_idx" ON "pledge_item_types"("isDefault");

-- CreateIndex
CREATE INDEX "pledge_items_pledgeId_idx" ON "pledge_items"("pledgeId");

-- CreateIndex
CREATE INDEX "pledge_alerts_userId_isRead_idx" ON "pledge_alerts"("userId", "isRead");

-- CreateIndex
CREATE INDEX "pledge_alerts_userId_createdAt_idx" ON "pledge_alerts"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "pledge_alerts_pledgeId_idx" ON "pledge_alerts"("pledgeId");

-- CreateIndex
CREATE INDEX "pledge_audits_pledgeId_createdAt_idx" ON "pledge_audits"("pledgeId", "createdAt");

-- CreateIndex
CREATE INDEX "MetalPrice_createdAt_idx" ON "MetalPrice"("createdAt");

-- CreateIndex
CREATE INDEX "MetalPrice_metal_createdAt_idx" ON "MetalPrice"("metal", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "transactions_pledgeId_createdAt_idx" ON "transactions"("pledgeId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "financial_snapshots_userId_calculatedAt_idx" ON "financial_snapshots"("userId", "calculatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "financial_snapshots_userId_snapshotDate_key" ON "financial_snapshots"("userId", "snapshotDate");

-- CreateIndex
CREATE INDEX "ExchangeRate_from_to_createdAt_idx" ON "ExchangeRate"("from", "to", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "tasks_userId_idx" ON "tasks"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_sourcePledgeId_key" ON "inventory_items"("sourcePledgeId");

-- CreateIndex
CREATE INDEX "inventory_items_ownerId_status_idx" ON "inventory_items"("ownerId", "status");

-- CreateIndex
CREATE INDEX "inventory_items_ownerId_sourceType_idx" ON "inventory_items"("ownerId", "sourceType");

-- CreateIndex
CREATE INDEX "inventory_items_ownerId_createdAt_idx" ON "inventory_items"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_items_sourcePledgeId_idx" ON "inventory_items"("sourcePledgeId");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge_item_types" ADD CONSTRAINT "pledge_item_types_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge_items" ADD CONSTRAINT "pledge_items_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge_alerts" ADD CONSTRAINT "pledge_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge_alerts" ADD CONSTRAINT "pledge_alerts_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge_alerts" ADD CONSTRAINT "pledge_alerts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge_audits" ADD CONSTRAINT "pledge_audits_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_snapshots" ADD CONSTRAINT "financial_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_sourcePledgeId_fkey" FOREIGN KEY ("sourcePledgeId") REFERENCES "pledges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
