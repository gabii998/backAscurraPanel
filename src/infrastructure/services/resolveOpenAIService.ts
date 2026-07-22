import { prisma } from "../db/prisma";
import { EncryptionService } from "./EncryptionService";
import { OpenAIService } from "./OpenAIService";
import { env } from "../../config/env";

const encryption = new EncryptionService(env.arcaEncryptionKey);

export async function resolveOpenAIService(brandId: string): Promise<OpenAIService> {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { openAiApiKey: true, openAiModel: true },
  });
  const apiKey = brand?.openAiApiKey ? encryption.decrypt(brand.openAiApiKey) : env.openAiApiKey;
  const model  = brand?.openAiModel  || env.openAiModel;
  return new OpenAIService(apiKey, model);
}
