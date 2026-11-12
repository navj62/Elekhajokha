-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'MAPPED', 'IN_REVIEW', 'COMMITTING', 'COMMITTED', 'FAILED', 'UNDONE');

-- CreateEnum
CREATE TYPE "ImportRowKind" AS ENUM ('CUSTOMER', 'PLEDGE', 'ITEM');

-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('CUSTOMER', 'PLEDGE', 'ITEM_TYPE');

-- CreateEnum
CREATE TYPE "ImportRecordAction" AS ENUM ('CREATED', 'LINKED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'IMPORTED';

-- CreateTable
CREATE TABLE "imports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sheetName" TEXT,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "mapping" JSONB,
    "fileAnswers" JSONB,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "counts" JSONB,
    "error" TEXT,
    "committedAt" TIMESTAMP(3),
    "undoneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_rows" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "kind" "ImportRowKind" NOT NULL,
    "customerRef" TEXT,
    "pledgeRef" TEXT,
    "data" JSONB NOT NULL,
    "raw" JSONB NOT NULL,
    "issues" JSONB NOT NULL DEFAULT '[]',
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imported_records" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "importRowId" TEXT NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "ImportRecordAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "imports_userId_status_idx" ON "imports"("userId", "status");

-- CreateIndex
CREATE INDEX "imports_userId_createdAt_idx" ON "imports"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "import_rows_importId_kind_idx" ON "import_rows"("importId", "kind");

-- CreateIndex
CREATE INDEX "imported_records_entityType_entityId_idx" ON "imported_records"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "imported_records_importId_importRowId_entityType_key" ON "imported_records"("importId", "importRowId", "entityType");

-- AddForeignKey
ALTER TABLE "imports" ADD CONSTRAINT "imports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_importId_fkey" FOREIGN KEY ("importId") REFERENCES "imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_records" ADD CONSTRAINT "imported_records_importId_fkey" FOREIGN KEY ("importId") REFERENCES "imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
