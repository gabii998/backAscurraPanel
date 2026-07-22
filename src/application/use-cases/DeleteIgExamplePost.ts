import { prisma } from "../../infrastructure/db/prisma";

export class DeleteIgExamplePost {
  async execute(id: string): Promise<void> {
    const exists = await prisma.igExamplePost.findUnique({ where: { id } });
    if (!exists) throw new Error("EXAMPLE_NOT_FOUND");
    await prisma.igExamplePost.delete({ where: { id } });
  }
}
