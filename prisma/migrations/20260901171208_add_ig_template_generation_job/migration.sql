-- AlterTable
ALTER TABLE "IgTemplate" ADD COLUMN     "generationError" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "generationJobId" TEXT,
ADD COLUMN     "generationStatus" TEXT NOT NULL DEFAULT 'done';

-- CreateTable
CREATE TABLE "IgTemplateGenerationJob" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "openAiBatchId" TEXT,
    "openAiKeySnapshot" TEXT,
    "prompt" TEXT NOT NULL,
    "styleDirection" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "templateCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IgTemplateGenerationJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IgTemplate" ADD CONSTRAINT "IgTemplate_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "IgTemplateGenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IgTemplateGenerationJob" ADD CONSTRAINT "IgTemplateGenerationJob_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
