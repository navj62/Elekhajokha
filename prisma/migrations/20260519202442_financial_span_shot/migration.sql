-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('SAFE', 'WATCH', 'AT_RISK', 'UNDERWATER');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('TIER_CHANGE', 'CRITICAL', 'INFO');

-- AlterTable
ALTER TABLE "pledge_items" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "pledges" ADD COLUMN     "lastCalculatedLtv" DECIMAL(5,2),
ADD COLUMN     "lastEvaluatedAt" TIMESTAMP(3),
ADD COLUMN     "lastRiskTier" "RiskTier";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "customerTerms" TEXT,
ADD COLUMN     "shopownerTerms" TEXT;

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
    "mtdNewPledges" INTEGER NOT NULL,
    "mtdReleasedPledges" INTEGER NOT NULL,
    "mtdLoanAmount" DECIMAL(14,2) NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pledge_alerts_userId_isRead_idx" ON "pledge_alerts"("userId", "isRead");

-- CreateIndex
CREATE INDEX "pledge_alerts_userId_createdAt_idx" ON "pledge_alerts"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "pledge_alerts_pledgeId_idx" ON "pledge_alerts"("pledgeId");

-- CreateIndex
CREATE INDEX "financial_snapshots_userId_calculatedAt_idx" ON "financial_snapshots"("userId", "calculatedAt" DESC);

-- AddForeignKey
ALTER TABLE "pledge_alerts" ADD CONSTRAINT "pledge_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge_alerts" ADD CONSTRAINT "pledge_alerts_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pledge_alerts" ADD CONSTRAINT "pledge_alerts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_snapshots" ADD CONSTRAINT "financial_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
