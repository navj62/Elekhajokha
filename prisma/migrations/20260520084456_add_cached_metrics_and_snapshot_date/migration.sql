/*
  Warnings:

  - A unique constraint covering the columns `[userId,snapshotDate]` on the table `financial_snapshots` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `snapshotDate` to the `financial_snapshots` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "financial_snapshots" ADD COLUMN     "snapshotDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "pledges" ADD COLUMN     "lastAmountOwed" DECIMAL(14,2),
ADD COLUMN     "lastMarketValue" DECIMAL(14,2);

-- CreateIndex
CREATE UNIQUE INDEX "financial_snapshots_userId_snapshotDate_key" ON "financial_snapshots"("userId", "snapshotDate");
