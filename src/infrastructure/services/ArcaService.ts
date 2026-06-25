import { Arca } from "@arcasdk/core";
import path from "path";
import os from "os";

export class ArcaService {
  private arca: Arca;

  constructor(config: { cuit: string; cert: string; privateKey: string; production: boolean; configId: string }) {
    this.arca = new Arca({
      production: config.production,
      cert: config.cert,
      key: config.privateKey,
      cuit: Number(config.cuit),
      ticketPath: path.join(os.tmpdir(), "arca-tickets", config.configId),
    });
  }

  get billing() { return this.arca.electronicBillingService; }
  get padron()  { return this.arca.registerInscriptionProofService; }
}
