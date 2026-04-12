/*
  Warnings:

  - A unique constraint covering the columns `[viewToken]` on the table `customers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "viewToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_viewToken_key" ON "customers"("viewToken");
