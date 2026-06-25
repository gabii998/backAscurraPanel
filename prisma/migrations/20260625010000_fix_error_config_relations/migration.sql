-- Drop projectId from AppError and ErrorConfig, add errorConfigId to AppError

ALTER TABLE "AppError" DROP COLUMN "projectId";

ALTER TABLE "ErrorConfig" DROP COLUMN "projectId";

ALTER TABLE "AppError" ADD COLUMN "errorConfigId" TEXT;

ALTER TABLE "AppError" ADD CONSTRAINT "AppError_errorConfigId_fkey"
  FOREIGN KEY ("errorConfigId") REFERENCES "ErrorConfig"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
