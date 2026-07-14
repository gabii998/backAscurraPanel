import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { EncryptionService } from "../src/infrastructure/services/EncryptionService";

const prisma = new PrismaClient();

async function main() {
  const encryptionKey = process.env.ARCA_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error("ARCA_ENCRYPTION_KEY is not set");

  const enc = new EncryptionService(encryptionKey);

  // Cast to any because the schema may still have apiKeyId at this point
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configs: any[] = await (prisma as any).arcaConfig.findMany();
  console.log(`Found ${configs.length} ArcaConfig records`);

  for (const config of configs) {
    const updates: Record<string, string> = {};

    if (!enc.isEncrypted(config.cert)) {
      updates.cert = enc.encrypt(config.cert);
      console.log(`  Encrypting cert for config ${config.id} (${config.name})`);
    }

    if (!enc.isEncrypted(config.privateKey)) {
      updates.privateKey = enc.encrypt(config.privateKey);
      console.log(`  Encrypting privateKey for config ${config.id} (${config.name})`);
    }

    if (Object.keys(updates).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).arcaConfig.update({ where: { id: config.id }, data: updates });
    }

    // Migrate old apiKeyId scalar to junction table if present
    if (config.apiKeyId) {
      const existing = await prisma.arcaConfigApiKey.findUnique({
        where: { apiKeyId: config.apiKeyId },
      }).catch(() => null);

      if (!existing) {
        await prisma.arcaConfigApiKey.create({
          data: { configId: config.id, apiKeyId: config.apiKeyId },
        });
        console.log(`  Migrated apiKeyId ${config.apiKeyId} → junction table`);
      }
    }
  }

  console.log("Done");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
