import type { Request, Response } from "express";
import type { AuthRequest } from "../../../infrastructure/http/express/middleware/authMiddleware";
import type { CreateBrand } from "../../../application/use-cases/CreateBrand";
import type { ListBrands } from "../../../application/use-cases/ListBrands";
import type { GetBrand } from "../../../application/use-cases/GetBrand";
import type { UpdateBrand } from "../../../application/use-cases/UpdateBrand";
import type { DeleteBrand } from "../../../application/use-cases/DeleteBrand";
import type { CreateIgExamplePost } from "../../../application/use-cases/CreateIgExamplePost";
import type { DeleteIgExamplePost } from "../../../application/use-cases/DeleteIgExamplePost";
import type { ListIgExamplePosts } from "../../../application/use-cases/ListIgExamplePosts";

export class BrandController {
  constructor(
    private createBrand:         CreateBrand,
    private listBrands:          ListBrands,
    private getBrand:            GetBrand,
    private updateBrand:         UpdateBrand,
    private deleteBrand:         DeleteBrand,
    private createIgExamplePost: CreateIgExamplePost,
    private deleteIgExamplePost: DeleteIgExamplePost,
    private listIgExamplePosts:  ListIgExamplePosts,
  ) {}

  handleList = async (_req: Request, res: Response): Promise<void> => {
    const brands = await this.listBrands.execute();
    res.json(brands);
  };

  handleGet = async (req: Request, res: Response): Promise<void> => {
    try {
      const brand = await this.getBrand.execute(req.params.id);
      res.json(brand);
    } catch (err) {
      if (err instanceof Error && err.message === "BRAND_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleCreate = async (req: Request, res: Response): Promise<void> => {
    const { name, industry, acknowledge, voice, colorPalette, logoUrl } = req.body as Record<string, unknown>;
    try {
      const brand = await this.createBrand.execute({
        name:         typeof name         === "string" ? name : "",
        industry:     typeof industry     === "string" ? industry : undefined,
        acknowledge:  typeof acknowledge  === "string" ? acknowledge : undefined,
        voice:        typeof voice        === "string" ? voice : undefined,
        colorPalette: Array.isArray(colorPalette) ? (colorPalette as string[]) : undefined,
        logoUrl:      typeof logoUrl      === "string" ? logoUrl : undefined,
      });
      res.status(201).json(brand);
    } catch (err) {
      if (err instanceof Error && err.message === "MISSING_FIELDS") {
        res.status(400).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleUpdate = async (req: Request, res: Response): Promise<void> => {
    const { name, industry, acknowledge, voice, colorPalette, logoUrl } = req.body as Record<string, unknown>;
    try {
      const brand = await this.updateBrand.execute(req.params.id, {
        ...(typeof name        === "string" && { name }),
        ...(typeof industry    === "string" && { industry }),
        ...(typeof acknowledge === "string" && { acknowledge }),
        ...(typeof voice       === "string" && { voice }),
        ...(Array.isArray(colorPalette)     && { colorPalette: colorPalette as string[] }),
        ...(typeof logoUrl     === "string" && { logoUrl }),
      });
      res.json(brand);
    } catch (err) {
      if (err instanceof Error && err.message === "BRAND_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleDelete = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.deleteBrand.execute(req.params.id);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message === "BRAND_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleListExamples = async (req: Request, res: Response): Promise<void> => {
    const examples = await this.listIgExamplePosts.execute(req.params.id);
    res.json(examples);
  };

  handleCreateExample = async (req: Request, res: Response): Promise<void> => {
    const { caption, imageUrl } = req.body as Record<string, unknown>;
    try {
      const example = await this.createIgExamplePost.execute({
        brandId:  req.params.id,
        caption:  typeof caption  === "string" ? caption  : "",
        imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
      });
      res.status(201).json(example);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "MISSING_FIELDS")  { res.status(400).json({ message: err.message }); return; }
        if (err.message === "BRAND_NOT_FOUND") { res.status(404).json({ message: err.message }); return; }
      }
      throw err;
    }
  };

  handleDeleteExample = async (req: Request, res: Response): Promise<void> => {
    void (req as AuthRequest).user;
    try {
      await this.deleteIgExamplePost.execute(req.params.exId);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && err.message === "EXAMPLE_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };
}
