-- DropIndex
DROP INDEX "customers_userId_mobile_key";

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "mobile" DROP NOT NULL,
ALTER COLUMN "idProofImg" DROP NOT NULL;
