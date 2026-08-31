import { randomUUID } from "crypto";
import type { IgPostRepository } from "../../domain/repositories/IgPostRepository";
import type { IgPost } from "../../domain/entities/IgPost";
import type { R2Storage } from "../../infrastructure/services/R2Storage";

export class UploadIgPostImage {
  constructor(private postRepo: IgPostRepository, private storage: R2Storage) {}

  async execute(postId: string, imageBuffer: Buffer): Promise<IgPost> {
    const post = await this.postRepo.findById(postId);
    if (!post) throw new Error("POST_NOT_FOUND");

    const key = `instagram/${post.brandId}/posts/${postId}/${randomUUID()}.png`;
    const imageUrl = await this.storage.put(key, imageBuffer, "image/png");
    return this.postRepo.update(postId, { imageUrl });
  }
}
