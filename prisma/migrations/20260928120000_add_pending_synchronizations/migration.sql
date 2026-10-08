CREATE TABLE "PendingSynchronization" (
    "id" TEXT NOT NULL,
    "clientItemId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "stackTrace" TEXT NOT NULL DEFAULT '',
    "meta" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingSynchronization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingSynchronization_apiKeyId_clientItemId_key"
ON "PendingSynchronization"("apiKeyId", "clientItemId");

CREATE INDEX "PendingSynchronization_receivedAt_idx"
ON "PendingSynchronization"("receivedAt");

ALTER TABLE "PendingSynchronization"
ADD CONSTRAINT "PendingSynchronization_apiKeyId_fkey"
FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
