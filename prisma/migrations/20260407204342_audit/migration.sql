-- AlterTable
ALTER TABLE "pledge_audits" ALTER COLUMN "totalInterest" DROP NOT NULL,
ALTER COLUMN "receivableAmount" DROP NOT NULL,
ALTER COLUMN "releaseDate" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "pledges_status_createdAt_idx" ON "pledges"("status", "createdAt");
