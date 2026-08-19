import type { UserRepository, UserWithStats } from "../../domain/repositories/UserRepository";
import type { User, UserRole } from "../../domain/entities/User";
import { prisma } from "../db/prisma";

const NOTIF_DEFAULTS: Record<string, boolean> = {
  "new-project": true,
  "task-assigned": true,
  "task-comment": false,
  "deploy-done": true,
  "weekly-digest": true,
  "client-update": false,
  "error-detected": true,
};

export class PrismaUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const row = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    return row ? this.toEntity(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    });
    return row ? this.toEntity(row) : null;
  }

  async create(user: User): Promise<User> {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        initials: user.initials,
        color: user.color,
        bio: user.bio,
        createdAt: user.createdAt,
        deletedAt: null,
      },
    });
    return user;
  }

  async list(): Promise<UserWithStats[]> {
    const rows = await prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        projects: {
          include: {
            project: { select: { name: true, deletedAt: true } },
          },
        },
        tasks: {
          where: { deletedAt: null },
          select: { column: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return rows.map(u => ({
      ...this.toEntity(u),
      projects: u.projects
        .filter(pm => !pm.project.deletedAt)
        .map(pm => pm.project.name),
      tasksAssigned: u.tasks.length,
      tasksDone: u.tasks.filter(t => t.column === "done").length,
    }));
  }

  async softDelete(id: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async updateProfile(
    id: string,
    data: { name?: string; email?: string; role?: string; bio?: string }
  ): Promise<User> {
    const row = await prisma.user.update({ where: { id }, data });
    return this.toEntity(row);
  }

  async changePassword(id: string, newHash: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { password: newHash } });
  }

  async getNotifications(id: string): Promise<Record<string, boolean>> {
    const row = await prisma.user.findFirst({ where: { id }, select: { notifSettings: true } });
    const stored = (row?.notifSettings ?? {}) as Record<string, boolean>;
    return { ...NOTIF_DEFAULTS, ...stored };
  }

  async updateNotifications(id: string, settings: Record<string, boolean>): Promise<void> {
    await prisma.user.update({ where: { id }, data: { notifSettings: settings } });
  }

  async setResetToken(email: string, token: string, expiry: Date): Promise<boolean> {
    const row = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
      select: { id: true },
    });
    if (!row) return false;
    await prisma.user.update({
      where: { id: row.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });
    return true;
  }

  async findByResetToken(token: string): Promise<User | null> {
    const row = await prisma.user.findFirst({
      where: { resetToken: token, deletedAt: null, resetTokenExpiry: { gt: new Date() } },
    });
    return row ? this.toEntity(row) : null;
  }

  async clearResetToken(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { resetToken: null, resetTokenExpiry: null },
    });
  }

  private toEntity(row: {
    id: string;
    name: string;
    email: string;
    password: string;
    role: string;
    initials: string;
    color: string;
    bio: string;
    createdAt: Date;
    deletedAt: Date | null;
  }): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      role: row.role as UserRole,
      initials: row.initials,
      color: row.color,
      bio: row.bio,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
    };
  }
}
