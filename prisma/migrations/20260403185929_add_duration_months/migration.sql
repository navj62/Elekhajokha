-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'RELEASED', 'RECALCULATED');

-- AlterEnum
ALTER TYPE "CompoundingDuration" ADD VALUE 'HALFYEARLY';

-- AlterTable
ALTER TABLE "pledges" ADD COLUMN     "allowCompounding" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "calculationVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "durationMonths" DECIMAL(6,2);

-- CreateTable
CREATE TABLE "PledgeAudit" (
    "id" TEXT NOT NULL,
    "pledgeId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "principal" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL,
    "allowCompounding" BOOLEAN NOT NULL,
    "compoundingDuration" "CompoundingDuration" NOT NULL,
    "calculationVersion" INTEGER NOT NULL,
    "durationMonths" DECIMAL(6,2),
    "totalInterest" DECIMAL(12,2) NOT NULL,
    "receivableAmount" DECIMAL(12,2) NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PledgeAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PledgeAudit_pledgeId_idx" ON "PledgeAudit"("pledgeId");

-- AddForeignKey
ALTER TABLE "PledgeAudit" ADD CONSTRAINT "PledgeAudit_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
