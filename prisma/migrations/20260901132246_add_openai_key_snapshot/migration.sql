-- AlterTable
ALTER TABLE "BrandLearning" ADD COLUMN     "openAiKeySnapshot" TEXT;

-- AlterTable
ALTER TABLE "IgBatchJob" ADD COLUMN     "openAiKeySnapshot" TEXT;

-- AlterTable
ALTER TABLE "IgExamplePost" ADD COLUMN     "openAiKeySnapshot" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;
