-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('REPAYMENT_PRINCIPAL', 'REPAYMENT_INTEREST', 'TOPUP');

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "pledgeId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_pledgeId_createdAt_idx" ON "transactions"("pledgeId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pledgeId_fkey" FOREIGN KEY ("pledgeId") REFERENCES "pledges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
