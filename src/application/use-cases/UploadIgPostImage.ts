import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { IgPostRepository } from "../../domain/repositories/IgPostRepository";
import type { IgPost } from "../../domain/entities/IgPost";
import { env } from "../../config/env";

export class UploadIgPostImage {
  constructor(private postRepo: IgPostRepository) {}

  async execute(postId: string, imageBuffer: Buffer): Promise<IgPost> {
    const post = await this.postRepo.findById(postId);
    if (!post) throw new Error("POST_NOT_FOUND");

    const uploadDir = join(process.cwd(), "public", "uploads", "ig-posts");
    mkdirSync(uploadDir, { recursive: true });

    const filename = `${postId}.png`;
    writeFileSync(join(uploadDir, filename), imageBuffer);

    const imageUrl = `${env.baseUrl}/uploads/ig-posts/${filename}`;
    return this.postRepo.update(postId, { imageUrl });
  }
}
