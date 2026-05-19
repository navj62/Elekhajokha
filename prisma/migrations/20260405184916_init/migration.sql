-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'RELEASED', 'RECALCULATED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('halfyearly', 'yearly');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trial', 'created', 'active', 'halted', 'expired');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('NECKLACE', 'CHAIN', 'RING', 'BANGLE', 'BRACELET', 'EARRING', 'ANKLET', 'PENDANT', 'COIN', 'BAR', 'OTHER');

-- CreateEnum
CREATE TYPE "MetalType" AS ENUM ('GOLD', 'SILVER');

-- CreateEnum
CREATE TYPE "PledgeStatus" AS ENUM ('ACTIVE', 'RELEASED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "CompoundingDuration" AS ENUM ('MONTHLY', 'HALFYEARLY', 'YEARLY', 'QUARTERLY');

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
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'created',
    "subscriptionEndDate" TIMESTAMP(3),
    "razorpaySubscriptionId" TEXT,
    "subscriptionPlan" "SubscriptionPlan",
    "razorpayPaymentId" TEXT,
    "subscriptionCreatedAt" TIMESTAMP(3),
    "hadTrial" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "mobile" TEXT,
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

    CONSTRAINT "pledges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pledge_items" (
    "id" TEXT NOT NULL,
    "pledgeId" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "metalType" "MetalType" NOT NULL,
    "itemName" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "grossWeight" DECIMAL(10,3) NOT NULL,
    "netWeight" DECIMAL(10,3) NOT NULL,
    "purity" DECIMAL(5,2) NOT NULL,
    "netWeightOfMetal" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "pledge_items_pkey" PRIMARY KEY ("id")
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
    "totalInterest" DECIMAL(12,2) NOT NULL,
    "receivableAmount" DECIMAL(12,2) NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pledge_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetalPrice" (
    "id" TEXT NOT NULL,
    "metal" "MetalType" NOT NULL,
    "usdPerOunce" DOUBLE PRECISION NOT NULL,
    "inrPerGram" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetalPrice_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "customers_userId_idx" ON "customers"("userId");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "pledges_customerId_idx" ON "pledges"("customerId");

-- CreateIndex
CREATE INDEX "pledge_items_pledgeId_idx" ON "pledge_items"("pledgeId");

-- CreateIndex
CREATE INDEX "pledge_audits_pledgeId_idx" ON "pledge_audits"("pledgeId");

-- CreateIndex
CREATE INDEX "MetalPrice_metal_createdAt_idx" ON "MetalPrice"("metal", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ExchangeRate_from_to_createdAt_idx" ON "ExchangeRate"("from", "to", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledges" ADD CONSTRAINT "pledges_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge_items" ADD CONSTRAINT "pledge_items_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge_audits" ADD CONSTRAINT "pledge_audits_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
