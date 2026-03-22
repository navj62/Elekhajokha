/*
  Warnings:

  - You are about to drop the column `idProof` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `photo` on the `customers` table. All the data in the column will be lost.
  - Added the required column `idProofImg` to the `customers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "customers" DROP COLUMN "idProof",
DROP COLUMN "photo",
ADD COLUMN     "aadharNo" TEXT,
ADD COLUMN     "customerImg" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "idProofImg" TEXT NOT NULL;
