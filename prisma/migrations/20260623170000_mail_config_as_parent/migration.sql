-- Add configId to MailTemplate and formalize relations

ALTER TABLE "MailTemplate" ADD COLUMN "configId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MailTemplate" DROP CONSTRAINT IF EXISTS "MailTemplate_name_key";
ALTER TABLE "MailTemplate" ADD CONSTRAINT "MailTemplate_configId_name_key" UNIQUE ("configId", "name");
ALTER TABLE "MailTemplate" ADD CONSTRAINT "MailTemplate_configId_fkey"
  FOREIGN KEY ("configId") REFERENCES "MailConfig"("id") ON DELETE CASCADE;

-- Formalize existing configId on MailLog as a real FK
-- MailLog.configId already exists as TEXT with default ''
-- Drop the default and add the FK constraint
ALTER TABLE "MailLog" ALTER COLUMN "configId" DROP DEFAULT;
ALTER TABLE "MailLog" ALTER COLUMN "configId" SET NOT NULL;
ALTER TABLE "MailLog" ADD CONSTRAINT "MailLog_configId_fkey"
  FOREIGN KEY ("configId") REFERENCES "MailConfig"("id");
