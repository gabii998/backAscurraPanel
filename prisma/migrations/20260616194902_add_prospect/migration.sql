-- CreateEnum
CREATE TYPE "ProspectStage" AS ENUM ('new', 'contacted', 'interested', 'discarded');

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "hasWebsite" BOOLEAN NOT NULL DEFAULT false,
    "hasSocialMedia" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreLabel" TEXT NOT NULL DEFAULT 'baja',
    "stage" "ProspectStage" NOT NULL DEFAULT 'new',
    "notes" TEXT NOT NULL DEFAULT '',
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_googleId_key" ON "Prospect"("googleId");
