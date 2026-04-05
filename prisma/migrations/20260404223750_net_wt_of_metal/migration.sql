/*
  Warnings:

  - You are about to drop the `PledgeAudit` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `netWeightOfMetal` to the `pledges` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PledgeAudit" DROP CONSTRAINT "PledgeAudit_pledgeId_fkey";

-- AlterTable
ALTER TABLE "pledges" ADD COLUMN     "netWeightOfMetal" DECIMAL(10,3) NOT NULL;

-- DropTable
DROP TABLE "PledgeAudit";

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
    "totalInterest" DECIMAL(12,2) NOT NULL,
    "receivableAmount" DECIMAL(12,2) NOT NULL,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pledge_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pledge_audits_pledgeId_idx" ON "pledge_audits"("pledgeId");

-- AddForeignKey
ALTER TABLE "pledge_audits" ADD CONSTRAINT "pledge_audits_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
