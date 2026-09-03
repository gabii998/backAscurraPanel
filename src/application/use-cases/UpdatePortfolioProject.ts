import { randomUUID } from "crypto";
import type { PortfolioProjectRepository } from "../../domain/repositories/PortfolioProjectRepository";
import type { PortfolioProject } from "../../domain/entities/PortfolioProject";
import type { R2Storage } from "../../infrastructure/services/R2Storage";

export interface UpdatePortfolioProjectInput {
  tag?: string;
  title?: string;
  description?: string;
  tech?: string[];
  file?: { buffer: Buffer; originalname: string; mimetype: string; size: number };
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export class UpdatePortfolioProject {
  constructor(
    private readonly repository: PortfolioProjectRepository,
    private readonly storage: R2Storage
  ) {}

  async execute(id: string, input: UpdatePortfolioProjectInput): Promise<PortfolioProject> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error("PORTFOLIO_PROJECT_NOT_FOUND");

    let imageUrl: string | undefined;
    let objectKey: string | undefined;

    if (input.file) {
      if (!ALLOWED_TYPES.has(input.file.mimetype)) throw new Error("INVALID_IMAGE_TYPE");
      objectKey = `portfolio/${id}/${randomUUID()}.${EXTENSIONS[input.file.mimetype]}`;
      imageUrl = await this.storage.put(objectKey, input.file.buffer, input.file.mimetype);
    }

    const updated = await this.repository.update(id, {
      ...(input.tag !== undefined ? { tag: input.tag } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.tech !== undefined ? { tech: input.tech } : {}),
      ...(imageUrl !== undefined ? { imageUrl, objectKey } : {}),
    });
    if (!updated) throw new Error("PORTFOLIO_PROJECT_NOT_FOUND");

    if (objectKey && existing.objectKey) {
      await this.storage.delete(existing.objectKey).catch(() => {});
    }

    return updated;
  }
}
