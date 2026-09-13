-- CreateTable
CREATE TABLE "cron_checkpoints" (
    "jobName" TEXT NOT NULL,
    "cursor" TEXT,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cron_checkpoints_pkey" PRIMARY KEY ("jobName")
);
