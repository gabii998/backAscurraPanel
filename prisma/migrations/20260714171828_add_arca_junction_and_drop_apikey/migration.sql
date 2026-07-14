/*
  Warnings:

  - You are about to drop the column `apiKeyId` on the `ArcaConfig` table. All the data in the column will be lost.
  - You are about to drop the column `webhookUrl` on the `MercadoPagoLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ArcaConfig" DROP COLUMN "apiKeyId";

-- AlterTable
ALTER TABLE "MercadoPagoConfig" ADD COLUMN     "backUrlFailure" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "backUrlPending" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "backUrlSuccess" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "webhookUrl" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "MercadoPagoLog" DROP COLUMN "webhookUrl";

-- CreateTable
CREATE TABLE "ArcaConfigApiKey" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArcaConfigApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArcaConfigApiKey_apiKeyId_key" ON "ArcaConfigApiKey"("apiKeyId");

-- CreateIndex
CREATE INDEX "ArcaConfigApiKey_configId_idx" ON "ArcaConfigApiKey"("configId");

-- AddForeignKey
ALTER TABLE "ArcaConfigApiKey" ADD CONSTRAINT "ArcaConfigApiKey_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ArcaConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArcaConfigApiKey" ADD CONSTRAINT "ArcaConfigApiKey_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
