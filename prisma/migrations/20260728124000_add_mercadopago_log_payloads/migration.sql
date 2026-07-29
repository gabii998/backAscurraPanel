ALTER TABLE "MercadoPagoLog" ADD COLUMN "request" JSONB;
ALTER TABLE "MercadoPagoLog" ADD COLUMN "response" JSONB;
ALTER TABLE "MercadoPagoLog" ADD COLUMN "webhookPayload" JSONB;
ALTER TABLE "MercadoPagoLog" ADD COLUMN "forwardStatusCode" INTEGER;
ALTER TABLE "MercadoPagoLog" ADD COLUMN "forwardResponse" TEXT NOT NULL DEFAULT '';
