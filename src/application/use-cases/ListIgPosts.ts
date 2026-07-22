import type { IgPostRepository } from "../../domain/repositories/IgPostRepository";
import type { IgPost, IgPostStatus } from "../../domain/entities/IgPost";

export class ListIgPosts {
  constructor(private repo: IgPostRepository) {}

  async execute(brandId: string, status?: IgPostStatus): Promise<IgPost[]> {
    return this.repo.findByBrandId(brandId, status);
  }
}
