/*
  Warnings:

  - You are about to alter the column `usdPerOunce` on the `MetalPrice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,4)`.
  - You are about to alter the column `inrPerGram` on the `MetalPrice` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DELETED';

-- AlterTable
ALTER TABLE "MetalPrice" ALTER COLUMN "usdPerOunce" SET DATA TYPE DECIMAL(12,4),
ALTER COLUMN "inrPerGram" SET DATA TYPE DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "MetalPrice_createdAt_idx" ON "MetalPrice"("createdAt");
