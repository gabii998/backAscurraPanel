-- CreateEnum
CREATE TYPE "ErrorSeverity" AS ENUM ('critical', 'error', 'warning');

-- CreateEnum
CREATE TYPE "ErrorStatus" AS ENUM ('unresolved', 'resolved', 'ignored');

-- CreateTable
CREATE TABLE "AppError" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "ErrorSeverity" NOT NULL DEFAULT 'error',
    "status" "ErrorStatus" NOT NULL DEFAULT 'unresolved',
    "count" INTEGER NOT NULL DEFAULT 1,
    "usersAffected" INTEGER NOT NULL DEFAULT 0,
    "stackTrace" TEXT NOT NULL DEFAULT '',
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metaUrl" TEXT NOT NULL DEFAULT '',
    "metaBrowser" TEXT NOT NULL DEFAULT '',
    "metaOs" TEXT NOT NULL DEFAULT '',
    "metaUser" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AppError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorOccurrence" (
    "id" TEXT NOT NULL,
    "errorId" TEXT NOT NULL,
    "userId" TEXT,
    "url" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorOccurrence_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AppError" ADD CONSTRAINT "AppError_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorOccurrence" ADD CONSTRAINT "ErrorOccurrence_errorId_fkey" FOREIGN KEY ("errorId") REFERENCES "AppError"("id") ON DELETE CASCADE ON UPDATE CASCADE;
