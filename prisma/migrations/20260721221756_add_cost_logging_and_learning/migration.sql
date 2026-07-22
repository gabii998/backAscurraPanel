-- AlterTable
ALTER TABLE "IgBatchJob" ADD COLUMN     "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "inputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outputTokens" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "IgCostLog" (
    "id" TEXT NOT NULL,
    "brandId" TEXT,
    "operation" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IgCostLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandLearning" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "insights" TEXT NOT NULL DEFAULT '',
    "insightStatus" TEXT NOT NULL DEFAULT 'pending',
    "openAiBatchId" TEXT,
    "totalApproved" INTEGER NOT NULL DEFAULT 0,
    "totalRejected" INTEGER NOT NULL DEFAULT 0,
    "lastSynthAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandLearning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IgCostLog_brandId_createdAt_idx" ON "IgCostLog"("brandId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "BrandLearning_brandId_key" ON "BrandLearning"("brandId");

-- AddForeignKey
ALTER TABLE "BrandLearning" ADD CONSTRAINT "BrandLearning_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
