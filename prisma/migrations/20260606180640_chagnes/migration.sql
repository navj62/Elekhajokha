-- DropIndex
DROP INDEX "customers_userId_idx";

-- DropIndex
DROP INDEX "pledge_audits_pledgeId_idx";

-- DropIndex
DROP INDEX "pledges_customerId_idx";

-- AlterTable
ALTER TABLE "pledges" ALTER COLUMN "lastCalculatedLtv" SET DATA TYPE DECIMAL(8,2);

-- CreateIndex
CREATE INDEX "customers_userId_deletedAt_idx" ON "customers"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "pledge_audits_pledgeId_createdAt_idx" ON "pledge_audits"("pledgeId", "createdAt");

-- CreateIndex
CREATE INDEX "pledges_customerId_status_idx" ON "pledges"("customerId", "status");
