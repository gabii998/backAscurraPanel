/*
  Warnings:

  - You are about to drop the column `notifSettings` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "notifSettings";

-- CreateTable
CREATE TABLE "UserNotifSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newProject" BOOLEAN NOT NULL DEFAULT true,
    "taskAssigned" BOOLEAN NOT NULL DEFAULT true,
    "taskComment" BOOLEAN NOT NULL DEFAULT true,
    "deployDone" BOOLEAN NOT NULL DEFAULT true,
    "weeklyDigest" BOOLEAN NOT NULL DEFAULT true,
    "clientUpdate" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserNotifSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNotifSettings_userId_key" ON "UserNotifSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserNotifSettings" ADD CONSTRAINT "UserNotifSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
