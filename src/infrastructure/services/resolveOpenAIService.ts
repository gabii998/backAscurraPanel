import { prisma } from "../db/prisma";
import { EncryptionService } from "./EncryptionService";
import { OpenAIService } from "./OpenAIService";
import { env } from "../../config/env";

const encryption = new EncryptionService(env.arcaEncryptionKey);

export async function resolveOpenAIService(
  brandId: string,
  apiKeySnapshot?: string | null,
): Promise<{ service: OpenAIService; keySnapshot: string; model: string }> {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { openAiApiKey: true, openAiModel: true },
  });
  const encryptedKey = apiKeySnapshot || brand?.openAiApiKey;
  if (!encryptedKey) {
    const error = new Error("BRAND_OPENAI_KEY_NOT_CONFIGURED") as Error & { statusCode: number };
    error.statusCode = 422;
    throw error;
  }
  const apiKey = encryption.decrypt(encryptedKey);
  const model  = brand?.openAiModel || env.openAiModel;
  return { service: new OpenAIService(apiKey, model), keySnapshot: encryptedKey, model };
}
