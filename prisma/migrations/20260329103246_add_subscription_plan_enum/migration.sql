/*
  Warnings:

  - A unique constraint covering the columns `[razorpaySubscriptionId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('halfyearly', 'yearly');

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'halted';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "razorpaySubscriptionId" TEXT,
ADD COLUMN     "subscriptionPlan" "SubscriptionPlan";

-- CreateIndex
CREATE UNIQUE INDEX "users_razorpaySubscriptionId_key" ON "users"("razorpaySubscriptionId");

-- CreateIndex
CREATE INDEX "users_razorpaySubscriptionId_idx" ON "users"("razorpaySubscriptionId");
