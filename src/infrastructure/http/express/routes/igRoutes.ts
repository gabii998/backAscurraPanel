import { Router, type RequestHandler } from "express";
import multer from "multer";
import type { IgController } from "../../../../interfaces/http/controllers/IgController";
import { wrapRequestHandler } from "../wrapRequestHandler";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

export const buildIgRoutes = (
  controller:     IgController,
  authMiddleware: RequestHandler,
): Router => {
  const router = Router();

  // Templates
  router.get("/brands/:brandId/ig-templates",  authMiddleware, wrapRequestHandler(controller.handleListTemplates.bind(controller)));
  router.post("/brands/:brandId/ig-templates", authMiddleware, wrapRequestHandler(controller.handleCreateTemplate.bind(controller)));
  router.put("/ig-templates/:id",              authMiddleware, wrapRequestHandler(controller.handleUpdateTemplate.bind(controller)));
  router.delete("/ig-templates/:id",           authMiddleware, wrapRequestHandler(controller.handleDeleteTemplate.bind(controller)));

  // Template summarization
  router.post("/ig-templates/summarize",              authMiddleware, wrapRequestHandler(controller.handleSummarize.bind(controller)));
  router.post("/ig-templates/check-summary-batch",    authMiddleware, wrapRequestHandler(controller.handleCheckSummaryBatch.bind(controller)));
  router.post("/brands/:brandId/ig-templates/check-summaries", authMiddleware, wrapRequestHandler(controller.handleCheckTemplateSummaries.bind(controller)));

  // AI template generation
  router.post("/brands/:brandId/ig-templates/generate", authMiddleware, wrapRequestHandler(controller.handleGenerateTemplates.bind(controller)));
  router.get("/brands/:brandId/ig-template-jobs",       authMiddleware, wrapRequestHandler(controller.handleListTemplateJobs.bind(controller)));
  router.post("/ig-template-jobs/:id/check",            authMiddleware, wrapRequestHandler(controller.handleCheckTemplateJob.bind(controller)));

  // Posts
  router.get("/brands/:brandId/ig-posts",          authMiddleware, wrapRequestHandler(controller.handleListPosts.bind(controller)));
  router.post("/brands/:brandId/ig-posts/generate", authMiddleware, wrapRequestHandler(controller.handleGenerate.bind(controller)));
  router.post("/brands/:brandId/ig-posts/estimate", authMiddleware, wrapRequestHandler(controller.handleEstimate.bind(controller)));
  router.get("/ig-posts/:id",                       authMiddleware, wrapRequestHandler(controller.handleGetPost.bind(controller)));
  router.patch("/ig-posts/:id/approve",             authMiddleware, wrapRequestHandler(controller.handleApprovePost.bind(controller)));
  router.patch("/ig-posts/:id/reject",              authMiddleware, wrapRequestHandler(controller.handleRejectPost.bind(controller)));

  // Batch jobs
  router.get("/brands/:brandId/ig-jobs", authMiddleware, wrapRequestHandler(controller.handleListJobs.bind(controller)));
  router.get("/ig-jobs/:id",             authMiddleware, wrapRequestHandler(controller.handleGetJob.bind(controller)));
  router.post("/ig-jobs/:id/check",      authMiddleware, wrapRequestHandler(controller.handleCheckBatch.bind(controller)));

  // Cost logs
  router.get("/brands/:brandId/ig-cost-logs", authMiddleware, wrapRequestHandler(controller.handleListCostLogs.bind(controller)));
  router.get("/ig-cost-logs",                 authMiddleware, wrapRequestHandler(controller.handleListAllCostLogs.bind(controller)));

  // Brand learning
  router.get("/brands/:brandId/ig-learning",             authMiddleware, wrapRequestHandler(controller.handleGetLearning.bind(controller)));
  router.post("/brands/:brandId/ig-learning/synthesize", authMiddleware, wrapRequestHandler(controller.handleSynthesize.bind(controller)));
  router.post("/ig-learning/check-synthesis",            authMiddleware, wrapRequestHandler(controller.handleCheckSynthesis.bind(controller)));

  // Instagram account connection
  router.post("/brands/:brandId/ig-connect",   authMiddleware, wrapRequestHandler(controller.handleConnectIgAccount.bind(controller)));
  router.delete("/brands/:brandId/ig-connect", authMiddleware, wrapRequestHandler(controller.handleDisconnectIgAccount.bind(controller)));

  // Publish
  router.post("/ig-posts/:id/upload-image", authMiddleware, upload.single("image"), wrapRequestHandler(controller.handleUploadImage.bind(controller)));
  router.post("/ig-posts/:id/publish",      authMiddleware, wrapRequestHandler(controller.handlePublishPost.bind(controller)));
  router.post("/ig-posts/:id/sync",         authMiddleware, wrapRequestHandler(controller.handleSyncPostMetrics.bind(controller)));
  router.post("/brands/:brandId/ig-posts/sync-all", authMiddleware, wrapRequestHandler(controller.handleSyncAllMetrics.bind(controller)));

  return router;
};
