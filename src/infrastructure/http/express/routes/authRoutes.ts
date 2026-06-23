import { Router } from "express";
import type { AuthController } from "../../../../interfaces/http/controllers/AuthController";
import { wrapRequestHandler } from "../wrapRequestHandler";

export const buildAuthRoutes = (controller: AuthController): Router => {
  const router = Router();
  router.post("/auth/register", wrapRequestHandler(controller.handleRegister.bind(controller)));
  router.post("/auth/login", wrapRequestHandler(controller.handleLogin.bind(controller)));
  router.post("/auth/forgot-password", wrapRequestHandler(controller.handleForgotPassword.bind(controller)));
  router.post("/auth/reset-password", wrapRequestHandler(controller.handleResetPassword.bind(controller)));
  return router;
};
