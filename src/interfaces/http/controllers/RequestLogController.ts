import type { Request, Response } from "express";
import type { ListRequestLogs } from "../../../application/use-cases/ListRequestLogs";

export class RequestLogController {
  constructor(private listRequestLogs: ListRequestLogs) {}

  handleList = async (req: Request, res: Response): Promise<void> => {
    const page  = typeof req.query["page"]  === "string" ? Math.max(1, parseInt(req.query["page"],  10) || 1) : 1;
    const limit = typeof req.query["limit"] === "string" ? Math.min(200, parseInt(req.query["limit"], 10) || 50) : 50;
    const result = await this.listRequestLogs.execute(page, limit);
    res.json(result);
  };
}
