import { Router, type RequestHandler } from "express";
import type { ArcaController } from "../../../../interfaces/http/controllers/ArcaController";
import { wrapRequestHandler } from "../wrapRequestHandler";
import { requireRole } from "../middleware/roleMiddleware";

export const buildArcaRoutes = (
  controller:          ArcaController,
  authMiddleware:      RequestHandler,
  ingestKeyMiddleware: RequestHandler,
): Router => {
  const router = Router();

  // Configs — JWT + admin
  router.get("/arca/configs",     authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleListConfigs.bind(controller)));
  router.post("/arca/configs",    authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleCreateConfig.bind(controller)));
  router.put("/arca/configs/:id", authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleUpdateConfig.bind(controller)));
  router.delete("/arca/configs/:id", authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleDeleteConfig.bind(controller)));

  // API key assignment — JWT + admin
  router.post("/arca/configs/:id/assign-key",              authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleAssignApiKey.bind(controller)));
  router.delete("/arca/configs/:id/assign-key/:apiKeyId",  authMiddleware, requireRole("admin"), wrapRequestHandler(controller.handleUnassignApiKey.bind(controller)));

  // Logs — JWT
  router.get("/arca/configs/:configId/logs", authMiddleware, wrapRequestHandler(controller.handleListLogs.bind(controller)));

  // Operations — API key
  router.post("/arca/wsfe/voucher",          ingestKeyMiddleware, wrapRequestHandler(controller.handleCreateVoucher.bind(controller)));
  router.post("/arca/wsfe/voucher/pdf",      ingestKeyMiddleware, wrapRequestHandler(controller.handleGenerateVoucherPdf.bind(controller)));
  router.get("/arca/wsfe/sales-points",      ingestKeyMiddleware, wrapRequestHandler(controller.handleGetSalesPoints.bind(controller)));
  router.get("/arca/padron/:identifier",     ingestKeyMiddleware, wrapRequestHandler(controller.handleGetTaxpayer.bind(controller)));

  return router;
};
