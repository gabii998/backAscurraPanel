import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { buildServer } from "../../src/infrastructure/http/express/Server";
import type { Express } from "express";

export let app: Express;
export const prisma = new PrismaClient();

export const setup = async (): Promise<void> => {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  app = buildServer();
};

export const teardown = async (): Promise<void> => {
  await prisma.$disconnect();
};

export const cleanDb = async (): Promise<void> => {
  await prisma.$transaction([
    prisma.arcaLog.deleteMany(),
    prisma.arcaConfigApiKey.deleteMany(),
    prisma.arcaConfig.deleteMany(),
    prisma.mailLog.deleteMany(),
    prisma.mailTemplate.deleteMany(),
    prisma.mailConfig.deleteMany(),
    prisma.mercadoPagoLog.deleteMany(),
    prisma.mercadoPagoConfig.deleteMany(),
    prisma.whatsAppMessage.deleteMany(),
    prisma.whatsAppLog.deleteMany(),
    prisma.whatsAppConfig.deleteMany(),
    prisma.errorOccurrence.deleteMany(),
    prisma.appError.deleteMany(),
    prisma.errorConfig.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.clientProject.deleteMany(),
    prisma.projectMember.deleteMany(),
    prisma.task.deleteMany(),
    prisma.project.deleteMany(),
    prisma.client.deleteMany(),
    prisma.user.deleteMany(),
  ]);
};
