/*
  Warnings:

  - Added the required column `updatedAt` to the `MetalPrice` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "MetalPrice_metal_createdAt_idx";

-- AlterTable
ALTER TABLE "MetalPrice" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "MetalPrice_metal_createdAt_idx" ON "MetalPrice"("metal", "createdAt" DESC);
