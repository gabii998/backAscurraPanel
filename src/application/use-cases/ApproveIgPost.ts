import type { IgPostRepository } from "../../domain/repositories/IgPostRepository";
import type { IgPost } from "../../domain/entities/IgPost";
import { prisma } from "../../infrastructure/db/prisma";
import { SynthesizeBrandLearning } from "./SynthesizeBrandLearning";
import type { OpenAIBatchService } from "../services/OpenAIBatchService";

export class ApproveIgPost {
  constructor(
    private repo: IgPostRepository,
    private openAI: OpenAIBatchService,
  ) {}

  async execute(id: string, approvedById: string): Promise<IgPost> {
    const post = await this.repo.findById(id);
    if (!post) throw new Error("POST_NOT_FOUND");
    if (post.status !== "draft") throw new Error("POST_NOT_IN_DRAFT");

    const approved = await this.repo.update(id, {
      status: "approved",
      approvedById,
      approvedAt: new Date(),
    });

    const learning = await prisma.brandLearning.upsert({
      where: { brandId: post.brandId },
      create: { brandId: post.brandId, totalApproved: 1 },
      update: { totalApproved: { increment: 1 } },
    });

    const total = learning.totalApproved + learning.totalRejected;
    if (total > 0 && total % 10 === 0) {
      new SynthesizeBrandLearning(this.openAI).execute(post.brandId).catch(() => {});
    }

    return approved;
  }
}
