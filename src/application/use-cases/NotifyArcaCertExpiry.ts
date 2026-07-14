import { randomUUID } from "crypto";
import type { ArcaConfigRepository } from "../../domain/repositories/ArcaConfigRepository";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { NotificationRepository } from "../../domain/repositories/NotificationRepository";

const WARN_DAYS = 30;
const NOTIFY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export class NotifyArcaCertExpiry {
  constructor(
    private configRepo: ArcaConfigRepository,
    private userRepo: UserRepository,
    private notifRepo: NotificationRepository,
  ) {}

  async execute(): Promise<void> {
    const configs = await this.configRepo.listWithApiKeys();
    const now = new Date();

    for (const config of configs) {
      if (!config.certExpiresAt) continue;

      const msUntilExpiry = config.certExpiresAt.getTime() - now.getTime();
      const daysUntilExpiry = msUntilExpiry / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry > WARN_DAYS) continue;

      const lastNotif = config.certExpiryNotifiedAt;
      if (lastNotif && now.getTime() - lastNotif.getTime() < NOTIFY_COOLDOWN_MS) continue;

      const allUsers = await this.userRepo.list();
      const admins = allUsers.filter((u) => u.role === "admin");
      if (admins.length === 0) continue;

      const expired = daysUntilExpiry <= 0;
      const title = expired ? "Certificado ARCA vencido" : "Certificado ARCA por vencer";
      const expiryStr = config.certExpiresAt.toLocaleDateString("es-AR");
      const body = expired
        ? `El certificado de «${config.name}» venció el ${expiryStr}. Las emisiones de comprobantes están fallando.`
        : `El certificado de «${config.name}» vence el ${expiryStr} (${Math.ceil(daysUntilExpiry)} día${Math.ceil(daysUntilExpiry) !== 1 ? "s" : ""}). Renovalo antes de que fallen las emisiones.`;

      for (const admin of admins) {
        await this.notifRepo.create({
          id: randomUUID(),
          userId: admin.id,
          type: "arca_cert_expiry",
          title,
          body,
          entityId: config.id,
          read: false,
          createdAt: now,
        });
      }

      await this.configRepo.updateCertExpiryNotifiedAt(config.id, now);
    }
  }
}
