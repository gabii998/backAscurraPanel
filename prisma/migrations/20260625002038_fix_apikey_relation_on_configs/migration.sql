/*
  Warnings:

  - You are about to drop the column `arcaConfigId` on the `ApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `mercadoPagoConfigId` on the `ApiKey` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_arcaConfigId_fkey";

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_mercadoPagoConfigId_fkey";

-- AlterTable
ALTER TABLE "ApiKey" DROP COLUMN "arcaConfigId",
DROP COLUMN "mercadoPagoConfigId";

-- AlterTable
ALTER TABLE "ArcaConfig" ADD COLUMN     "apiKeyId" TEXT;

-- AlterTable
ALTER TABLE "MailConfig" ADD COLUMN     "apiKeyId" TEXT;

-- AlterTable
ALTER TABLE "MercadoPagoConfig" ADD COLUMN     "apiKeyId" TEXT;
