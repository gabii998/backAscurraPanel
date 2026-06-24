-- CreateTable MercadoPagoConfig
CREATE TABLE "MercadoPagoConfig" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "publicKey"   TEXT NOT NULL,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MercadoPagoConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MercadoPagoConfig_name_key" ON "MercadoPagoConfig"("name");

-- CreateTable MercadoPagoLog
CREATE TABLE "MercadoPagoLog" (
  "id"                TEXT NOT NULL,
  "apiKeyId"          TEXT NOT NULL,
  "configId"          TEXT NOT NULL,
  "externalReference" TEXT NOT NULL DEFAULT '',
  "preferenceId"      TEXT NOT NULL DEFAULT '',
  "paymentId"         TEXT NOT NULL DEFAULT '',
  "webhookUrl"        TEXT NOT NULL DEFAULT '',
  "checkoutUrl"       TEXT NOT NULL DEFAULT '',
  "status"            TEXT NOT NULL DEFAULT 'pending',
  "amount"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency"          TEXT NOT NULL DEFAULT 'ARS',
  "error"             TEXT NOT NULL DEFAULT '',
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MercadoPagoLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MercadoPagoLog" ADD CONSTRAINT "MercadoPagoLog_configId_fkey"
  FOREIGN KEY ("configId") REFERENCES "MercadoPagoConfig"("id") ON DELETE CASCADE;
