/*
  Warnings:

  - You are about to drop the column `weightGrams` on the `inventory_items` table. All the data in the column will be lost.
  - Added the required column `grossWeight` to the `inventory_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "inventory_items" DROP COLUMN "weightGrams",
ADD COLUMN     "grossWeight" DECIMAL(10,3) NOT NULL,
ADD COLUMN     "netWeightOfGold" DECIMAL(10,3) NOT NULL DEFAULT 0,
ADD COLUMN     "netWeightOfSilver" DECIMAL(10,3) NOT NULL DEFAULT 0;
