import type { Request, Response } from "express";
import type { ListUsers } from "../../../application/use-cases/ListUsers";
import type { RegisterUser } from "../../../application/use-cases/RegisterUser";
import type { UpdateUser } from "../../../application/use-cases/UpdateUser";
import type { ChangePassword } from "../../../application/use-cases/ChangePassword";
import type { GetActiveSessions } from "../../../application/use-cases/GetActiveSessions";
import type { RevokeSession } from "../../../application/use-cases/RevokeSession";
import type { UserRepository } from "../../../domain/repositories/UserRepository";
import type { AuthRequest } from "../../../infrastructure/http/express/middleware/authMiddleware";

const AVATAR_COLORS = [
  "#7c3aed", "#059669", "#2563eb", "#ea580c",
  "#db2777", "#0891b2", "#65a30d", "#b45309",
];

function buildInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("");
}

function toProfileDto(user: { id: string; name: string; email: string; role: string; initials: string; color: string; bio: string; }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, initials: user.initials, color: user.color, bio: user.bio };
}

export class UserController {
  constructor(
    private readonly listUsers: ListUsers,
    private readonly registerUser: RegisterUser,
    private readonly userRepository: UserRepository,
    private readonly updateUser: UpdateUser,
    private readonly changePassword: ChangePassword,
    private readonly getActiveSessions: GetActiveSessions,
    private readonly revokeSession: RevokeSession
  ) {}

  // GET /users/me
  async handleGetMe(req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthRequest).user;
    const user = await this.userRepository.findById(userId);
    if (!user) { res.status(404).json({ message: "USER_NOT_FOUND" }); return; }
    res.json(toProfileDto(user));
  }

  // PATCH /users/me
  async handleUpdateMe(req: Request, res: Response): Promise<void> {
    const { userId, role: callerRole } = (req as AuthRequest).user;
    const { name, email, role, bio } = req.body as Record<string, string>;
    const user = await this.updateUser.execute(userId, {
      name,
      email,
      bio,
      ...(callerRole === 'admin' ? { role } : {}),
    });
    res.json(toProfileDto(user));
  }

  // PATCH /users/me/password
  async handleChangePassword(req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthRequest).user;
    const { currentPassword, newPassword } = req.body as Record<string, string>;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: "MISSING_FIELDS" });
      return;
    }

    try {
      await this.changePassword.execute(userId, currentPassword, newPassword);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "WRONG_PASSWORD") {
          res.status(400).json({ message: "WRONG_PASSWORD" });
          return;
        }
        if (error.message === "SAME_PASSWORD") {
          res.status(400).json({ message: "SAME_PASSWORD" });
          return;
        }
      }
      throw error;
    }
  }

  // GET /users/me/notifications
  async handleGetNotifications(req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthRequest).user;
    const settings = await this.userRepository.getNotifications(userId);
    res.json(settings);
  }

  // PATCH /users/me/notifications
  async handleUpdateNotifications(req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthRequest).user;
    const settings = req.body as Record<string, boolean>;
    await this.userRepository.updateNotifications(userId, settings);
    res.json(settings);
  }

  // GET /users/me/sessions
  async handleGetSessions(req: Request, res: Response): Promise<void> {
    const { userId, jti } = (req as AuthRequest).user;
    const sessions = await this.getActiveSessions.execute(userId, jti);
    res.json(sessions);
  }

  // DELETE /users/me/sessions/:id
  async handleRevokeSession(req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthRequest).user;
    const { id } = req.params;

    try {
      await this.revokeSession.execute(id, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === "SESSION_NOT_FOUND") {
        res.status(404).json({ message: "SESSION_NOT_FOUND" });
        return;
      }
      throw error;
    }
  }

  // GET /users
  async handleList(_req: Request, res: Response): Promise<void> {
    const users = await this.listUsers.execute();
    res.json(users);
  }

  // POST /users
  async handleCreate(req: Request, res: Response): Promise<void> {
    const { name, email, role, password } = req.body as Record<string, string>;

    if (!name || !email || !role || !password) {
      res.status(400).json({ message: "MISSING_FIELDS" });
      return;
    }

    try {
      const count = await this.userRepository.list();
      const color = AVATAR_COLORS[count.length % AVATAR_COLORS.length];
      const initials = buildInitials(name);

      const { user } = await this.registerUser.execute({ name, email, password, role: role as 'admin' | 'member' | undefined, initials, color });

      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        initials: user.initials,
        color: user.color,
        projects: [],
        tasksAssigned: 0,
        tasksDone: 0,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_TAKEN") {
        res.status(409).json({ message: "EMAIL_TAKEN" });
        return;
      }
      throw error;
    }
  }

  // DELETE /users/:id
  async handleDelete(req: Request, res: Response): Promise<void> {
    await this.userRepository.softDelete(req.params.id);
    res.status(204).send();
  }
}
