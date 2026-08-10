import { AuthRepository, ArcaServiceNames, FileSystemTicketStorage } from "@arcasdk/core";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";

export interface RefreshedArcaTicket {
  service: "wsfe";
  expiresAt: Date;
}

export class RefreshArcaTicket {
  constructor(private readonly configRepo: ArcaConfigRepository) {}

  async execute(configId: string): Promise<RefreshedArcaTicket> {
    const config = await this.configRepo.getById(configId);
    if (!config) throw new Error("ARCA_CONFIG_NOT_FOUND");

    const ticketPath = path.join(os.tmpdir(), "arca-tickets", config.id);

    try {
      await fs.rm(ticketPath, { recursive: true, force: true });

      const ticketStorage = new FileSystemTicketStorage({
        ticketPath,
        cuit: Number(config.cuit),
        production: config.production,
      });
      const auth = new AuthRepository({
        cert: config.cert,
        key: config.privateKey,
        cuit: Number(config.cuit),
        production: config.production,
        ticketStorage,
      });
      const ticket = await auth.login(ArcaServiceNames.WSFE);

      return { service: "wsfe", expiresAt: ticket.getExpiration() };
    } catch (err) {
      console.error("[ArcaTicket] Failed to refresh WSFE ticket:", err);
      throw new Error("ARCA_TICKET_REFRESH_FAILED");
    }
  }
}
