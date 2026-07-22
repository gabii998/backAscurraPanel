import type { IgPostRepository } from "../../domain/repositories/IgPostRepository";
import type { IgPost } from "../../domain/entities/IgPost";
import { prisma } from "../../infrastructure/db/prisma";
import { SynthesizeBrandLearning } from "./SynthesizeBrandLearning";
import type { OpenAIBatchService } from "../services/OpenAIBatchService";

export class RejectIgPost {
  constructor(
    private repo: IgPostRepository,
    private openAI: OpenAIBatchService,
  ) {}

  async execute(id: string, rejectReason?: string): Promise<IgPost> {
    const post = await this.repo.findById(id);
    if (!post) throw new Error("POST_NOT_FOUND");
    if (post.status !== "draft") throw new Error("POST_NOT_IN_DRAFT");

    const rejected = await this.repo.update(id, {
      status: "rejected",
      rejectedAt: new Date(),
      rejectReason: rejectReason ?? "",
    });

    const learning = await prisma.brandLearning.upsert({
      where: { brandId: post.brandId },
      create: { brandId: post.brandId, totalRejected: 1 },
      update: { totalRejected: { increment: 1 } },
    });

    const total = learning.totalApproved + learning.totalRejected;
    if (total > 0 && total % 10 === 0) {
      new SynthesizeBrandLearning(this.openAI).execute(post.brandId).catch(() => {});
    }

    return rejected;
  }
}
