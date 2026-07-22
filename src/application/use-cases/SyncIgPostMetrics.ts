import type { IgPostRepository } from "../../domain/repositories/IgPostRepository";
import type { BrandRepository } from "../../domain/repositories/BrandRepository";
import type { MetaGraphService } from "../../infrastructure/services/MetaGraphService";
import type { EncryptionService } from "../../infrastructure/services/EncryptionService";

export class SyncIgPostMetrics {
  constructor(
    private postRepo:    IgPostRepository,
    private brandRepo:   BrandRepository,
    private metaGraph:   MetaGraphService,
    private encryption:  EncryptionService,
  ) {}

  async executeForPost(postId: string): Promise<void> {
    const post = await this.postRepo.findById(postId);
    if (!post || !post.instagramMediaId) throw new Error("POST_NOT_FOUND_OR_NOT_PUBLISHED");

    const brand = await this.brandRepo.findById(post.brandId);
    if (!brand || !brand.igUserId) throw new Error("BRAND_IG_NOT_CONNECTED");

    const rawBrand = await this.getBrandWithToken(post.brandId);
    const token = this.encryption.decrypt(rawBrand.igAccessToken);

    const metrics = await this.metaGraph.getPostInsights(post.instagramMediaId, token);
    await this.postRepo.update(postId, {
      igImpressions: metrics.impressions,
      igReach:       metrics.reach,
      igEngagement:  metrics.engagement,
      igSaved:       metrics.saved,
      igSyncedAt:    new Date(),
    });
  }

  async executeForBrand(brandId: string): Promise<{ synced: number }> {
    const brand = await this.brandRepo.findById(brandId);
    if (!brand || !brand.igUserId) throw new Error("BRAND_IG_NOT_CONNECTED");

    const rawBrand = await this.getBrandWithToken(brandId);
    const token = this.encryption.decrypt(rawBrand.igAccessToken);

    const posts = await this.postRepo.findByBrandId(brandId, "approved");
    const publishedPosts = posts.filter(p => p.instagramMediaId);

    let synced = 0;
    for (const post of publishedPosts) {
      try {
        const metrics = await this.metaGraph.getPostInsights(post.instagramMediaId!, token);
        await this.postRepo.update(post.id, {
          igImpressions: metrics.impressions,
          igReach:       metrics.reach,
          igEngagement:  metrics.engagement,
          igSaved:       metrics.saved,
          igSyncedAt:    new Date(),
        });
        synced++;
      } catch {
        // continue with other posts
      }
    }
    return { synced };
  }

  private async getBrandWithToken(brandId: string): Promise<{ igAccessToken: string }> {
    const { prisma } = await import("../../infrastructure/db/prisma");
    const raw = await prisma.brand.findUnique({ where: { id: brandId }, select: { igAccessToken: true } });
    if (!raw) throw new Error("BRAND_NOT_FOUND");
    return raw;
  }
}
