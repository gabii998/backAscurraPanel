export type ClientStatus = "active" | "prospect" | "inactive";

export interface Client {
  id: string;
  company: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  status: ClientStatus;
  contractSince: string | null;
  lastActivity: Date;
  initials: string;
  color: string;
  createdAt: Date;
  deletedAt: Date | null;
  projectIds: string[];
}
