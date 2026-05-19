/*
  Warnings:

  - The values [QUARTERLY] on the enum `CompoundingDuration` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CompoundingDuration_new" AS ENUM ('MONTHLY', 'HALFYEARLY', 'YEARLY');
ALTER TABLE "pledges" ALTER COLUMN "compoundingDuration" TYPE "CompoundingDuration_new" USING ("compoundingDuration"::text::"CompoundingDuration_new");
ALTER TABLE "pledge_audits" ALTER COLUMN "compoundingDuration" TYPE "CompoundingDuration_new" USING ("compoundingDuration"::text::"CompoundingDuration_new");
ALTER TYPE "CompoundingDuration" RENAME TO "CompoundingDuration_old";
ALTER TYPE "CompoundingDuration_new" RENAME TO "CompoundingDuration";
DROP TYPE "public"."CompoundingDuration_old";
COMMIT;
