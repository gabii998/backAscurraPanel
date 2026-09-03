import type { Request, Response } from "express";
import type { CreatePortfolioProject } from "../../../application/use-cases/CreatePortfolioProject";
import type { ListPortfolioProjects } from "../../../application/use-cases/ListPortfolioProjects";
import type { GetPortfolioProject } from "../../../application/use-cases/GetPortfolioProject";
import type { UpdatePortfolioProject } from "../../../application/use-cases/UpdatePortfolioProject";
import type { DeletePortfolioProject } from "../../../application/use-cases/DeletePortfolioProject";
import type { ReorderPortfolioProjects } from "../../../application/use-cases/ReorderPortfolioProjects";

const parseTech = (body: Record<string, unknown>): string[] => {
  const raw = body.tech;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string" && raw.length > 0) return [raw];
  return [];
};

export class PortfolioProjectController {
  constructor(
    private readonly createPortfolioProject: CreatePortfolioProject,
    private readonly listPortfolioProjects: ListPortfolioProjects,
    private readonly getPortfolioProject: GetPortfolioProject,
    private readonly updatePortfolioProject: UpdatePortfolioProject,
    private readonly deletePortfolioProject: DeletePortfolioProject,
    private readonly reorderPortfolioProjects: ReorderPortfolioProjects
  ) {}

  async handleList(_req: Request, res: Response): Promise<void> {
    const projects = await this.listPortfolioProjects.execute();
    res.json(projects);
  }

  async handleGet(req: Request, res: Response): Promise<void> {
    try {
      const project = await this.getPortfolioProject.execute(req.params.id);
      res.json(project);
    } catch (error) {
      if (error instanceof Error && error.message === "PORTFOLIO_PROJECT_NOT_FOUND") {
        res.status(404).json({ message: "PORTFOLIO_PROJECT_NOT_FOUND" });
        return;
      }
      throw error;
    }
  }

  async handleCreate(req: Request, res: Response): Promise<void> {
    const { tag, title, description } = req.body as Record<string, string>;
    const tech = parseTech(req.body as Record<string, unknown>);
    const file = (req as Request & { file?: Express.Multer.File }).file;

    try {
      if (!tag || !title || !description || !file) {
        res.status(400).json({ message: "MISSING_FIELDS" });
        return;
      }
      const project = await this.createPortfolioProject.execute({ tag, title, description, tech, file });
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof Error && (error.message === "MISSING_FIELDS" || error.message === "INVALID_IMAGE_TYPE")) {
        res.status(400).json({ message: error.message });
        return;
      }
      throw error;
    }
  }

  async handleUpdate(req: Request, res: Response): Promise<void> {
    const { tag, title, description } = req.body as Record<string, string | undefined>;
    const hasTech = (req.body as Record<string, unknown>).tech !== undefined;
    const file = (req as Request & { file?: Express.Multer.File }).file;

    try {
      const project = await this.updatePortfolioProject.execute(req.params.id, {
        tag,
        title,
        description,
        ...(hasTech ? { tech: parseTech(req.body as Record<string, unknown>) } : {}),
        file,
      });
      res.json(project);
    } catch (error) {
      if (error instanceof Error && error.message === "PORTFOLIO_PROJECT_NOT_FOUND") {
        res.status(404).json({ message: "PORTFOLIO_PROJECT_NOT_FOUND" });
        return;
      }
      if (error instanceof Error && error.message === "INVALID_IMAGE_TYPE") {
        res.status(400).json({ message: error.message });
        return;
      }
      throw error;
    }
  }

  async handleDelete(req: Request, res: Response): Promise<void> {
    try {
      await this.deletePortfolioProject.execute(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === "PORTFOLIO_PROJECT_NOT_FOUND") {
        res.status(404).json({ message: "PORTFOLIO_PROJECT_NOT_FOUND" });
        return;
      }
      throw error;
    }
  }

  async handleReorder(req: Request, res: Response): Promise<void> {
    const { orderedIds } = req.body as { orderedIds?: string[] };
    try {
      await this.reorderPortfolioProjects.execute(orderedIds ?? []);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === "MISSING_FIELDS") {
        res.status(400).json({ message: "MISSING_FIELDS" });
        return;
      }
      throw error;
    }
  }
}
