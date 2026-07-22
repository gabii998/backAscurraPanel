import type { IgPostRepository } from "../../domain/repositories/IgPostRepository";
import type { IgPost } from "../../domain/entities/IgPost";

export class GetIgPost {
  constructor(private repo: IgPostRepository) {}

  async execute(id: string): Promise<IgPost> {
    const post = await this.repo.findById(id);
    if (!post) throw new Error("POST_NOT_FOUND");
    return post;
  }
}
