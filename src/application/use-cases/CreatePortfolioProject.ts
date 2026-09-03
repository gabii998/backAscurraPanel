import { randomUUID } from "crypto";
import type { PortfolioProjectRepository } from "../../domain/repositories/PortfolioProjectRepository";
import type { PortfolioProject } from "../../domain/entities/PortfolioProject";
import type { R2Storage } from "../../infrastructure/services/R2Storage";

export interface CreatePortfolioProjectInput {
  tag: string;
  title: string;
  description: string;
  tech: string[];
  file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export class CreatePortfolioProject {
  constructor(
    private readonly repository: PortfolioProjectRepository,
    private readonly storage: R2Storage
  ) {}

  async execute(input: CreatePortfolioProjectInput): Promise<PortfolioProject> {
    if (!input.tag || !input.title || !input.description) throw new Error("MISSING_FIELDS");
    if (!input.file) throw new Error("MISSING_FIELDS");
    if (!ALLOWED_TYPES.has(input.file.mimetype)) throw new Error("INVALID_IMAGE_TYPE");

    const id = randomUUID();
    const objectKey = `portfolio/${id}/${randomUUID()}.${EXTENSIONS[input.file.mimetype]}`;
    const imageUrl = await this.storage.put(objectKey, input.file.buffer, input.file.mimetype);
    const sortOrder = await this.repository.count();

    const project: PortfolioProject = {
      id,
      tag: input.tag,
      title: input.title,
      description: input.description,
      tech: input.tech,
      imageUrl,
      objectKey,
      sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      return await this.repository.create(project);
    } catch (error) {
      await this.storage.delete(objectKey).catch(() => {});
      throw error;
    }
  }
}
