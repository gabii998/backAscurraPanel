ALTER TABLE "MailConfig" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "MailLog" ADD COLUMN "configId" TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX "MailConfig_name_key" ON "MailConfig"("name");
