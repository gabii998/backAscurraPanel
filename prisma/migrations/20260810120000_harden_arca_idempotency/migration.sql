ALTER TABLE "ArcaLog" ADD COLUMN "emisorCuit" TEXT;
UPDATE "ArcaLog" SET "emisorCuit" = '' WHERE "emisorCuit" IS NULL;
ALTER TABLE "ArcaLog" ALTER COLUMN "emisorCuit" SET NOT NULL;
ALTER TABLE "ArcaLog" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP INDEX IF EXISTS "ArcaLog_idempotencyKey_key";
CREATE UNIQUE INDEX "ArcaLog_configId_emisorCuit_idempotencyKey_key" ON "ArcaLog"("configId", "emisorCuit", "idempotencyKey");
CREATE INDEX "ArcaLog_configId_emisorCuit_idempotencyKey_idx" ON "ArcaLog"("configId", "emisorCuit", "idempotencyKey");
