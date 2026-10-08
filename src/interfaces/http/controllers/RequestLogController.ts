import type { Request, Response } from "express";
import type { ListRequestLogs } from "../../../application/use-cases/ListRequestLogs";

import type { ClearRequestLogs } from "../../../application/use-cases/ClearRequestLogs";

export class RequestLogController {
  constructor(private listRequestLogs: ListRequestLogs, private clearRequestLogs: ClearRequestLogs) {}

  async handleClear(_req: Request, res: Response): Promise<void> {
    const clearedCount = await this.clearRequestLogs.execute();
    res.json({ clearedCount });
  }

  handleList = async (req: Request, res: Response): Promise<void> => {
    const page       = typeof req.query["page"]  === "string" ? Math.max(1, parseInt(req.query["page"],  10) || 1) : 1;
    const limit      = typeof req.query["limit"] === "string" ? Math.min(200, parseInt(req.query["limit"], 10) || 50) : 50;
    const pathPrefix = typeof req.query["path"]  === "string" ? req.query["path"].trim() || undefined : undefined;
    const result = await this.listRequestLogs.execute(page, limit, pathPrefix);
    res.json(result);
  };
}
