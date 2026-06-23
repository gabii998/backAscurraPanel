import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import type { RegisterUser } from "../../../application/use-cases/RegisterUser";
import type { LoginUser } from "../../../application/use-cases/LoginUser";
import type { ForgotPassword } from "../../../application/use-cases/ForgotPassword";
import type { ResetPassword } from "../../../application/use-cases/ResetPassword";
import type { SessionRepository } from "../../../domain/repositories/SessionRepository";

export class AuthController {
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly loginUser: LoginUser,
    private readonly forgotPassword: ForgotPassword,
    private readonly resetPassword: ResetPassword,
    private readonly sessionRepository: SessionRepository
  ) {}

  async handleRegister(req: Request, res: Response): Promise<void> {
    const { name, email, password, role, initials, color } = req.body as Record<string, string>;

    if (!name || !email || !password || !initials || !color) {
      res.status(400).json({ message: "MISSING_FIELDS" });
      return;
    }

    try {
      const { user, token, jti, expiresAt } = await this.registerUser.execute({ name, email, password, role: role as 'admin' | 'member' | undefined, initials, color });

      void this.sessionRepository.create({
        id: randomUUID(),
        jti,
        userId: user.id,
        ipAddress: (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ?? req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
        expiresAt,
        revokedAt: null,
      });

      res.status(201).json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, initials: user.initials, color: user.color },
      });
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_TAKEN") {
        res.status(409).json({ message: "EMAIL_TAKEN" });
        return;
      }
      throw error;
    }
  }

  async handleLogin(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as Record<string, string>;

    if (!email || !password) {
      res.status(400).json({ message: "MISSING_CREDENTIALS" });
      return;
    }

    try {
      const { user, token, jti, expiresAt } = await this.loginUser.execute({ email, password });

      void this.sessionRepository.create({
        id: randomUUID(),
        jti,
        userId: user.id,
        ipAddress: (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ?? req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
        expiresAt,
        revokedAt: null,
      });

      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, initials: user.initials, color: user.color },
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
        res.status(401).json({ message: "INVALID_CREDENTIALS" });
        return;
      }
      throw error;
    }
  }

  async handleForgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body as Record<string, string>;
    if (!email) {
      res.status(400).json({ message: "MISSING_FIELDS" });
      return;
    }

    const token = await this.forgotPassword.execute(email);
    const payload: { message: string; resetLink?: string } = { message: "EMAIL_SENT" };
    if (token) payload.resetLink = `/restablecer?token=${token}`;
    res.json(payload);
  }

  async handleResetPassword(req: Request, res: Response): Promise<void> {
    const { token, newPassword } = req.body as Record<string, string>;
    if (!token || !newPassword) {
      res.status(400).json({ message: "MISSING_FIELDS" });
      return;
    }

    try {
      await this.resetPassword.execute(token, newPassword);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_TOKEN") {
        res.status(400).json({ message: "INVALID_TOKEN" });
        return;
      }
      throw error;
    }
  }
}
