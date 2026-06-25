-- DropForeignKey
ALTER TABLE "MailLog" DROP CONSTRAINT "MailLog_configId_fkey";

-- DropForeignKey
ALTER TABLE "MailTemplate" DROP CONSTRAINT "MailTemplate_configId_fkey";

-- DropForeignKey
ALTER TABLE "MercadoPagoLog" DROP CONSTRAINT "MercadoPagoLog_configId_fkey";

-- DropIndex
DROP INDEX "MailTemplate_name_key";

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "arcaConfigId" TEXT;

-- AlterTable
ALTER TABLE "MailConfig" ALTER COLUMN "name" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MailTemplate" ALTER COLUMN "configId" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ArcaConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "cert" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "production" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArcaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArcaLog" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "request" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "error" TEXT NOT NULL DEFAULT '',
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArcaLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArcaConfig_name_key" ON "ArcaConfig"("name");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_arcaConfigId_fkey" FOREIGN KEY ("arcaConfigId") REFERENCES "ArcaConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailTemplate" ADD CONSTRAINT "MailTemplate_configId_fkey" FOREIGN KEY ("configId") REFERENCES "MailConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailLog" ADD CONSTRAINT "MailLog_configId_fkey" FOREIGN KEY ("configId") REFERENCES "MailConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArcaLog" ADD CONSTRAINT "ArcaLog_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ArcaConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MercadoPagoLog" ADD CONSTRAINT "MercadoPagoLog_configId_fkey" FOREIGN KEY ("configId") REFERENCES "MercadoPagoConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
