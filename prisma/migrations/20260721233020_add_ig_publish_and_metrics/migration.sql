-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "igAccessToken" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "igUserId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "IgPost" ADD COLUMN     "igEngagement" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "igImpressions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "igReach" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "igSaved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "igSyncedAt" TIMESTAMP(3),
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "instagramMediaId" TEXT,
ADD COLUMN     "publishStatus" TEXT NOT NULL DEFAULT 'unpublished',
ADD COLUMN     "publishedAt" TIMESTAMP(3);
