-- CreateEnum
CREATE TYPE "IgPostStatus" AS ENUM ('generating', 'draft', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL DEFAULT '',
    "acknowledge" TEXT NOT NULL DEFAULT '',
    "voice" TEXT NOT NULL DEFAULT '',
    "colorPalette" JSONB NOT NULL DEFAULT '[]',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IgExamplePost" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IgExamplePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IgTemplate" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "variables" TEXT[],
    "summary" TEXT NOT NULL DEFAULT '',
    "summaryStatus" TEXT NOT NULL DEFAULT 'pending',
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IgTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IgPost" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "templateId" TEXT,
    "batchJobId" TEXT,
    "caption" TEXT NOT NULL,
    "hashtags" TEXT[],
    "variables" JSONB NOT NULL DEFAULT '{}',
    "status" "IgPostStatus" NOT NULL DEFAULT 'draft',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IgPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IgBatchJob" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "openAiBatchId" TEXT,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IgBatchJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IgExamplePost" ADD CONSTRAINT "IgExamplePost_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IgTemplate" ADD CONSTRAINT "IgTemplate_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IgPost" ADD CONSTRAINT "IgPost_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IgPost" ADD CONSTRAINT "IgPost_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "IgTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IgPost" ADD CONSTRAINT "IgPost_batchJobId_fkey" FOREIGN KEY ("batchJobId") REFERENCES "IgBatchJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IgBatchJob" ADD CONSTRAINT "IgBatchJob_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
