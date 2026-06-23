import type { AppErrorRepository, ListErrorsFilter } from "../../domain/repositories/AppErrorRepository";
import type { AppError, ErrorSeverity, ErrorStatus, OccurrenceData } from "../../domain/entities/AppError";
import { prisma } from "../db/prisma";

export class PrismaAppErrorRepository implements AppErrorRepository {
  async findByFingerprint(projectId: string | null, type: string, message: string): Promise<AppError | null> {
    const row = await prisma.appError.findFirst({
      where: { projectId: projectId ?? null, type, message, deletedAt: null },
    });
    return row ? this.toEntity(row, []) : null;
  }

  async findById(id: string): Promise<AppError | null> {
    const row = await prisma.appError.findFirst({ where: { id, deletedAt: null } });
    if (!row) return null;
    const sparkline = await this.getSparkline(id);
    return this.toEntity(row, sparkline);
  }

  async list(filter: ListErrorsFilter): Promise<AppError[]> {
    const rows = await prisma.appError.findMany({
      where: {
        deletedAt: null,
        ...(filter.severity ? { severity: filter.severity } : {}),
        ...(filter.status   ? { status:   filter.status   } : {}),
        ...(filter.projectId ? { projectId: filter.projectId } : {}),
        ...(filter.query
          ? {
              OR: [
                { type:    { contains: filter.query, mode: "insensitive" } },
                { message: { contains: filter.query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { lastSeen: "desc" },
    });

    return Promise.all(
      rows.map(async (r) => {
        const sparkline = await this.getSparkline(r.id);
        return this.toEntity(r, sparkline);
      })
    );
  }

  async create(error: AppError): Promise<AppError> {
    await prisma.appError.create({
      data: {
        id:            error.id,
        projectId:     error.projectId,
        type:          error.type,
        message:       error.message,
        severity:      error.severity,
        status:        error.status,
        count:         error.count,
        usersAffected: error.usersAffected,
        stackTrace:    error.stackTrace,
        firstSeen:     error.firstSeen,
        lastSeen:      error.lastSeen,
        metaUrl:       error.metaUrl,
        metaBrowser:   error.metaBrowser,
        metaOs:        error.metaOs,
        metaUser:      error.metaUser,
        createdAt:     error.createdAt,
        deletedAt:     null,
      },
    });
    return error;
  }

  async addOccurrence(errorId: string, data: OccurrenceData): Promise<void> {
    await prisma.errorOccurrence.create({
      data: {
        errorId,
        userId:  data.userId,
        url:     data.url     || null,
        browser: data.browser || null,
        os:      data.os      || null,
      },
    });
  }

  async updateCounts(id: string, data: { count: number; usersAffected: number; lastSeen: Date }): Promise<void> {
    await prisma.appError.update({
      where: { id },
      data: { count: data.count, usersAffected: data.usersAffected, lastSeen: data.lastSeen },
    });
  }

  async updateStatus(id: string, status: ErrorStatus): Promise<AppError | null> {
    const existing = await prisma.appError.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;
    await prisma.appError.update({ where: { id }, data: { status } });
    return this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const existing = await prisma.appError.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return false;
    await prisma.appError.update({ where: { id }, data: { deletedAt: new Date() } });
    return true;
  }

  async getSparkline(errorId: string): Promise<number[]> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const occurrences = await prisma.errorOccurrence.findMany({
      where: { errorId, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now);
      day.setDate(day.getDate() - (6 - i));
      day.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      return occurrences.filter((o) => o.createdAt >= day && o.createdAt <= dayEnd).length;
    });
  }

  async isUserKnown(errorId: string, userId: string): Promise<boolean> {
    const count = await prisma.errorOccurrence.count({
      where: { errorId, userId },
    });
    return count > 0;
  }

  private toEntity(
    row: {
      id: string;
      projectId: string | null;
      type: string;
      message: string;
      severity: string;
      status: string;
      count: number;
      usersAffected: number;
      stackTrace: string;
      firstSeen: Date;
      lastSeen: Date;
      metaUrl: string;
      metaBrowser: string;
      metaOs: string;
      metaUser: string;
      createdAt: Date;
      deletedAt: Date | null;
    },
    sparkline: number[]
  ): AppError {
    return {
      id:            row.id,
      projectId:     row.projectId,
      type:          row.type,
      message:       row.message,
      severity:      row.severity as ErrorSeverity,
      status:        row.status   as ErrorStatus,
      count:         row.count,
      usersAffected: row.usersAffected,
      stackTrace:    row.stackTrace,
      firstSeen:     row.firstSeen,
      lastSeen:      row.lastSeen,
      metaUrl:       row.metaUrl,
      metaBrowser:   row.metaBrowser,
      metaOs:        row.metaOs,
      metaUser:      row.metaUser,
      sparkline,
      createdAt:     row.createdAt,
      deletedAt:     row.deletedAt,
    };
  }
}
