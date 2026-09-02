import type { Request, Response } from "express";
import type { AuthRequest } from "../../../infrastructure/http/express/middleware/authMiddleware";
import type { GenerateIgPosts } from "../../../application/use-cases/GenerateIgPosts";
import type { CheckBatchStatus } from "../../../application/use-cases/CheckBatchStatus";
import type { ListIgPosts } from "../../../application/use-cases/ListIgPosts";
import type { GetIgPost } from "../../../application/use-cases/GetIgPost";
import type { ApproveIgPost } from "../../../application/use-cases/ApproveIgPost";
import type { RejectIgPost } from "../../../application/use-cases/RejectIgPost";
import type { ListIgBatchJobs } from "../../../application/use-cases/ListIgBatchJobs";
import type { GetIgBatchJob } from "../../../application/use-cases/GetIgBatchJob";
import type { ListIgCostLogs } from "../../../application/use-cases/ListIgCostLogs";
import type { SynthesizeBrandLearning } from "../../../application/use-cases/SynthesizeBrandLearning";
import type { CheckSynthesisBatch } from "../../../application/use-cases/CheckSynthesisBatch";
import type { ConnectIgAccount } from "../../../application/use-cases/ConnectIgAccount";
import type { PublishIgPost } from "../../../application/use-cases/PublishIgPost";
import type { SyncIgPostMetrics } from "../../../application/use-cases/SyncIgPostMetrics";
import type { EstimateIgGenerationCost } from "../../../application/use-cases/EstimateIgGenerationCost";
import type { IgPostStatus } from "../../../domain/entities/IgPost";
import { prisma } from "../../../infrastructure/db/prisma";

export class IgController {
  constructor(
    private generateIgPosts:           GenerateIgPosts,
    private checkBatchStatus:          CheckBatchStatus,
    private listIgPosts:               ListIgPosts,
    private getIgPost:                 GetIgPost,
    private approveIgPost:             ApproveIgPost,
    private rejectIgPost:              RejectIgPost,
    private listIgBatchJobs:           ListIgBatchJobs,
    private getIgBatchJob:             GetIgBatchJob,
    private listIgCostLogs:            ListIgCostLogs,
    private synthesizeBrandLearning:   SynthesizeBrandLearning,
    private checkSynthesisBatch:       CheckSynthesisBatch,
    private connectIgAccount:          ConnectIgAccount,
    private publishIgPost:             PublishIgPost,
    private syncIgPostMetrics:         SyncIgPostMetrics,
    private estimateIgGenerationCost:  EstimateIgGenerationCost,
  ) {}

  // ── Posts ─────────────────────────────────────────────

  handleListPosts = async (req: Request, res: Response): Promise<void> => {
    const { status } = req.query as Record<string, string>;
    const posts = await this.listIgPosts.execute(req.params.brandId, status as IgPostStatus | undefined);
    res.json(posts);
  };

  handleGetPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const post = await this.getIgPost.execute(req.params.id);
      res.json(post);
    } catch (err) {
      if (err instanceof Error && err.message === "POST_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleGenerate = async (req: Request, res: Response): Promise<void> => {
    const { quantity, topic, contentAssetIds, campaignContext } = req.body as Record<string, unknown>;
    try {
      const job = await this.generateIgPosts.execute({
        brandId:         req.params.brandId,
        quantity:        typeof quantity === "number" ? quantity : parseInt(String(quantity || "1"), 10),
        topic:           typeof topic === "string" ? topic : undefined,
        contentAssetIds: Array.isArray(contentAssetIds) ? contentAssetIds.filter((id): id is string => typeof id === "string") : [],
        campaignContext: typeof campaignContext === "string" ? campaignContext : undefined,
      });
      res.status(201).json(job);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "BRAND_NOT_FOUND")   { res.status(404).json({ message: err.message }); return; }
        if (err.message === "INVALID_QUANTITY")  { res.status(400).json({ message: err.message }); return; }
        if (err.message === "INVALID_REFERENCE_POSTS") { res.status(400).json({ message: err.message }); return; }
      }
      throw err;
    }
  };

  handleEstimate = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as Record<string, unknown>;
    const quantity = typeof body.quantity === "number" ? body.quantity : parseInt(String(body.quantity || "1"), 10);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 50) { res.status(400).json({ message: "INVALID_QUANTITY" }); return; }
    try {
      res.json(await this.estimateIgGenerationCost.execute(req.params.brandId, {
        quantity,
        topic: typeof body.topic === "string" ? body.topic : undefined,
        campaignContext: typeof body.campaignContext === "string" ? body.campaignContext : undefined,
        contentAssetIds: Array.isArray(body.contentAssetIds) ? body.contentAssetIds.filter((id): id is string => typeof id === "string") : [],
      }));
    } catch (err) { if (err instanceof Error && err.message === "BRAND_NOT_FOUND") { res.status(404).json({ message: err.message }); return; } throw err; }
  };

  handleApprovePost = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user.userId;
    try {
      const post = await this.approveIgPost.execute(req.params.id, userId);
      res.json(post);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "POST_NOT_FOUND")   { res.status(404).json({ message: err.message }); return; }
        if (err.message === "POST_NOT_IN_DRAFT") { res.status(409).json({ message: err.message }); return; }
      }
      throw err;
    }
  };

  handleRejectPost = async (req: Request, res: Response): Promise<void> => {
    const { rejectReason } = req.body as Record<string, unknown>;
    try {
      const post = await this.rejectIgPost.execute(
        req.params.id,
        typeof rejectReason === "string" ? rejectReason : undefined,
      );
      res.json(post);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "POST_NOT_FOUND")   { res.status(404).json({ message: err.message }); return; }
        if (err.message === "POST_NOT_IN_DRAFT") { res.status(409).json({ message: err.message }); return; }
      }
      throw err;
    }
  };

  // ── Batch Jobs ────────────────────────────────────────

  handleListJobs = async (req: Request, res: Response): Promise<void> => {
    const jobs = await this.listIgBatchJobs.execute(req.params.brandId);
    res.json(jobs);
  };

  handleGetJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const job = await this.getIgBatchJob.execute(req.params.id);
      res.json(job);
    } catch (err) {
      if (err instanceof Error && err.message === "BATCH_JOB_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleCheckBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const job = await this.checkBatchStatus.execute(req.params.id);
      res.json(job);
    } catch (err) {
      if (err instanceof Error && err.message === "BATCH_JOB_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  // ── Cost Logs ─────────────────────────────────────────

  handleListCostLogs = async (req: Request, res: Response): Promise<void> => {
    const result = await this.listIgCostLogs.execute(req.params.brandId);
    res.json(result);
  };

  handleListAllCostLogs = async (req: Request, res: Response): Promise<void> => {
    const result = await this.listIgCostLogs.execute();
    res.json(result);
  };

  // ── Brand Learning ────────────────────────────────────

  handleGetLearning = async (req: Request, res: Response): Promise<void> => {
    const learning = await prisma.brandLearning.findUnique({
      where: { brandId: req.params.brandId },
    });
    res.json(learning ?? { brandId: req.params.brandId, insights: "", insightStatus: "pending", totalApproved: 0, totalRejected: 0 });
  };

  handleSynthesize = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.synthesizeBrandLearning.execute(req.params.brandId);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message === "BRAND_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleCheckSynthesis = async (req: Request, res: Response): Promise<void> => {
    const { brandId, openAiBatchId } = req.body as Record<string, unknown>;
    if (typeof brandId !== "string" || typeof openAiBatchId !== "string") {
      res.status(400).json({ message: "MISSING_FIELDS" }); return;
    }
    const result = await this.checkSynthesisBatch.execute(brandId, openAiBatchId);
    res.json(result);
  };

  // ── Instagram Account ─────────────────────────────────

  handleConnectIgAccount = async (req: Request, res: Response): Promise<void> => {
    const { igUserId, igAccessToken } = req.body as Record<string, unknown>;
    if (typeof igUserId !== "string" || typeof igAccessToken !== "string" || !igUserId || !igAccessToken) {
      res.status(400).json({ message: "MISSING_FIELDS" }); return;
    }
    try {
      const brand = await this.connectIgAccount.execute(req.params.brandId, igUserId, igAccessToken);
      res.json(brand);
    } catch (err) {
      if (err instanceof Error && err.message === "BRAND_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  handleDisconnectIgAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const brand = await this.connectIgAccount.disconnect(req.params.brandId);
      res.json(brand);
    } catch (err) {
      if (err instanceof Error && err.message === "BRAND_NOT_FOUND") {
        res.status(404).json({ message: err.message }); return;
      }
      throw err;
    }
  };

  // ── Publish ───────────────────────────────────────────

  handlePublishPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const post = await this.publishIgPost.execute(req.params.id);
      res.json(post);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "POST_NOT_FOUND")        { res.status(404).json({ message: err.message }); return; }
        if (err.message === "POST_NOT_APPROVED")     { res.status(409).json({ message: err.message }); return; }
        if (err.message === "POST_IMAGE_NOT_READY")  { res.status(400).json({ message: err.message }); return; }
        if (err.message === "POST_ALREADY_PUBLISHED") { res.status(409).json({ message: err.message }); return; }
        if (err.message === "BRAND_IG_NOT_CONNECTED") { res.status(400).json({ message: err.message }); return; }
      }
      throw err;
    }
  };

  handleSyncPostMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.syncIgPostMetrics.executeForPost(req.params.id);
      res.json({ synced: true });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "POST_NOT_FOUND_OR_NOT_PUBLISHED") { res.status(404).json({ message: err.message }); return; }
        if (err.message === "BRAND_IG_NOT_CONNECTED")           { res.status(400).json({ message: err.message }); return; }
      }
      throw err;
    }
  };

  handleSyncAllMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.syncIgPostMetrics.executeForBrand(req.params.brandId);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message === "BRAND_IG_NOT_CONNECTED") {
        res.status(400).json({ message: err.message }); return;
      }
      throw err;
    }
  };
}
