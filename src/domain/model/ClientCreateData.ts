import type { ClientStatus } from "../entities/Client";

export interface ClientCreateData {
  company: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  status?: ClientStatus;
  contractSince?: string;
  initials: string;
  color: string;
}

export interface ClientUpdateData {
  company?: string;
  industry?: string;
  contactName?: string;
  contactEmail?: string;
  status?: ClientStatus;
  contractSince?: string | null;
  lastActivity?: Date;
  initials?: string;
  color?: string;
}
