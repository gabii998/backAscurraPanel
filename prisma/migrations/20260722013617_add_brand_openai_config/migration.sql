-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "openAiApiKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "openAiModel" TEXT NOT NULL DEFAULT '';
