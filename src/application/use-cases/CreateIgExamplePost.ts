import type { IgExamplePost } from "../../domain/entities/IgExamplePost";
import type { BrandRepository } from "../../domain/repositories/BrandRepository";
import { prisma } from "../../infrastructure/db/prisma";

export interface CreateIgExamplePostInput {
  brandId: string;
  caption: string;
  imageUrl?: string;
}

export class CreateIgExamplePost {
  constructor(private brandRepo: BrandRepository) {}

  async execute(input: CreateIgExamplePostInput): Promise<IgExamplePost> {
    if (!input.caption) throw new Error("MISSING_FIELDS");
    const brand = await this.brandRepo.findById(input.brandId);
    if (!brand) throw new Error("BRAND_NOT_FOUND");
    return prisma.igExamplePost.create({
      data: {
        brandId: input.brandId,
        caption: input.caption,
        imageUrl: input.imageUrl ?? "",
      },
    });
  }
}
