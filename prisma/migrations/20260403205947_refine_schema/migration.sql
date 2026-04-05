/*
  Warnings:

  - You are about to drop the column `currency` on the `MetalPrice` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `MetalPrice` table. All the data in the column will be lost.
  - Added the required column `inrPerGram` to the `MetalPrice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inrPerOunce` to the `MetalPrice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usdPerOunce` to the `MetalPrice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MetalPrice" DROP COLUMN "currency",
DROP COLUMN "price",
ADD COLUMN     "inrPerGram" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "inrPerOunce" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "usdPerOunce" DOUBLE PRECISION NOT NULL;
