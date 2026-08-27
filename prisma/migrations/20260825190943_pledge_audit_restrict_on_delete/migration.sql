-- DropForeignKey
ALTER TABLE "pledge_audits" DROP CONSTRAINT "pledge_audits_pledgeId_fkey";

-- AddForeignKey
ALTER TABLE "pledge_audits" ADD CONSTRAINT "pledge_audits_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
