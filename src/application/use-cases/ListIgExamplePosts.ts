import type { IgExamplePost } from "../../domain/entities/IgExamplePost";
import { prisma } from "../../infrastructure/db/prisma";

export class ListIgExamplePosts {
  async execute(brandId: string): Promise<IgExamplePost[]> {
    return prisma.igExamplePost.findMany({
      where: { brandId },
      orderBy: { createdAt: "desc" },
    });
  }
}
