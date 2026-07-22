import type { IgPostRepository } from "../../domain/repositories/IgPostRepository";
import type { BrandRepository } from "../../domain/repositories/BrandRepository";
import type { MetaGraphService } from "../../infrastructure/services/MetaGraphService";
import type { EncryptionService } from "../../infrastructure/services/EncryptionService";
import type { SyncIgPostMetrics } from "./SyncIgPostMetrics";
import type { IgPost } from "../../domain/entities/IgPost";
import { prisma } from "../../infrastructure/db/prisma";

export class PublishIgPost {
  constructor(
    private postRepo:   IgPostRepository,
    private brandRepo:  BrandRepository,
    private metaGraph:  MetaGraphService,
    private encryption: EncryptionService,
    private syncMetrics: SyncIgPostMetrics,
  ) {}

  async execute(postId: string): Promise<IgPost> {
    const post = await this.postRepo.findById(postId);
    if (!post) throw new Error("POST_NOT_FOUND");
    if (post.status !== "approved") throw new Error("POST_NOT_APPROVED");
    if (!post.imageUrl) throw new Error("POST_IMAGE_NOT_UPLOADED");
    if (post.publishStatus === "published") throw new Error("POST_ALREADY_PUBLISHED");

    const brand = await this.brandRepo.findById(post.brandId);
    if (!brand || !brand.igUserId) throw new Error("BRAND_IG_NOT_CONNECTED");

    const rawBrand = await prisma.brand.findUnique({
      where: { id: post.brandId },
      select: { igAccessToken: true },
    });
    if (!rawBrand?.igAccessToken) throw new Error("BRAND_IG_NOT_CONNECTED");

    const token = this.encryption.decrypt(rawBrand.igAccessToken);
    const caption = [post.caption, ...post.hashtags].join("\n\n") ;

    await this.postRepo.update(postId, { publishStatus: "publishing" });

    try {
      const creationId = await this.metaGraph.createMediaContainer(brand.igUserId, token, post.imageUrl, caption);
      const mediaId    = await this.metaGraph.publishMedia(brand.igUserId, token, creationId);

      const published = await this.postRepo.update(postId, {
        instagramMediaId: mediaId,
        publishStatus:    "published",
        publishedAt:      new Date(),
      });

      this.syncMetrics.executeForPost(postId).catch(() => {});

      return published;
    } catch (err) {
      await this.postRepo.update(postId, { publishStatus: "failed" });
      throw err;
    }
  }
}
