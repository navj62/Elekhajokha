/*
  Warnings:

  - Added the required column `mtdLoanAmount` to the `financial_snapshots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mtdNewPledges` to the `financial_snapshots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mtdReleasedPledges` to the `financial_snapshots` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "financial_snapshots" ADD COLUMN     "mtdLoanAmount" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "mtdNewPledges" INTEGER NOT NULL,
ADD COLUMN     "mtdReleasedPledges" INTEGER NOT NULL;
