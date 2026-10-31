-- AlterTable
ALTER TABLE "users" ADD COLUMN     "defaultAllowCompounding" BOOLEAN,
ADD COLUMN     "defaultCompoundingDuration" "CompoundingDuration",
ADD COLUMN     "defaultInterestRate" DECIMAL(5,2);
