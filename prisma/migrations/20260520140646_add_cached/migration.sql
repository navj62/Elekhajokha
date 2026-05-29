/*
  Warnings:

  - You are about to drop the column `mtdLoanAmount` on the `financial_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `mtdNewPledges` on the `financial_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `mtdReleasedPledges` on the `financial_snapshots` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "financial_snapshots" DROP COLUMN "mtdLoanAmount",
DROP COLUMN "mtdNewPledges",
DROP COLUMN "mtdReleasedPledges";
