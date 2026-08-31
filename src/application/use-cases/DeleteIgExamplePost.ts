import { prisma } from "../../infrastructure/db/prisma";
import type { R2Storage } from "../../infrastructure/services/R2Storage";

export class DeleteIgExamplePost {
  constructor(private storage: R2Storage) {}
  async execute(id: string): Promise<void> {
    const exists = await prisma.igExamplePost.findUnique({ where: { id } });
    if (!exists) throw new Error("EXAMPLE_NOT_FOUND");
    if (exists.objectKey) await this.storage.delete(exists.objectKey);
    await prisma.igExamplePost.delete({ where: { id } });
  }
}
