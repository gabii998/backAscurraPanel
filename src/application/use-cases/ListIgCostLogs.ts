import { prisma } from "../../infrastructure/db/prisma";

export interface IgCostLogEntry {
  id: string;
  brandId: string | null;
  operation: string;
  entityId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  requestCount: number;
  createdAt: Date;
}

export interface ListIgCostLogsResult {
  logs: IgCostLogEntry[];
  totalCostUsd: number;
}

export class ListIgCostLogs {
  async execute(brandId?: string): Promise<ListIgCostLogsResult> {
    const logs = await prisma.igCostLog.findMany({
      where: brandId ? { brandId } : undefined,
      orderBy: { createdAt: "desc" },
    });

    const totalCostUsd = logs.reduce((sum, l) => sum + l.estimatedCostUsd, 0);

    return { logs: logs as IgCostLogEntry[], totalCostUsd };
  }
}
