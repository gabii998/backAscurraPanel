/*
  Warnings:

  - You are about to drop the column `templateId` on the `IgPost` table. All the data in the column will be lost.
  - You are about to drop the column `variables` on the `IgPost` table. All the data in the column will be lost.
  - You are about to drop the `IgTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IgTemplateGenerationJob` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "IgPost" DROP CONSTRAINT "IgPost_templateId_fkey";

-- DropForeignKey
ALTER TABLE "IgTemplate" DROP CONSTRAINT "IgTemplate_brandId_fkey";

-- DropForeignKey
ALTER TABLE "IgTemplate" DROP CONSTRAINT "IgTemplate_generationJobId_fkey";

-- DropForeignKey
ALTER TABLE "IgTemplateGenerationJob" DROP CONSTRAINT "IgTemplateGenerationJob_brandId_fkey";

-- AlterTable
ALTER TABLE "IgBatchJob" ADD COLUMN     "imageOpenAiBatchId" TEXT;

-- AlterTable
ALTER TABLE "IgPost" DROP COLUMN "templateId",
DROP COLUMN "variables",
ADD COLUMN     "imagePrompt" TEXT NOT NULL DEFAULT '';

-- DropTable
DROP TABLE "IgTemplate";

-- DropTable
DROP TABLE "IgTemplateGenerationJob";
