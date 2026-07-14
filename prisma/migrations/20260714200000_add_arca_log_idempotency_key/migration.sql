-- AlterTable
ALTER TABLE "ArcaLog" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ArcaLog_idempotencyKey_key" ON "ArcaLog"("idempotencyKey");
