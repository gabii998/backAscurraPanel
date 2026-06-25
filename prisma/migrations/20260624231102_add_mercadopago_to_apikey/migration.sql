-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "mercadoPagoConfigId" TEXT;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_mercadoPagoConfigId_fkey" FOREIGN KEY ("mercadoPagoConfigId") REFERENCES "MercadoPagoConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
