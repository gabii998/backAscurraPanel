export type ContactRequestStatus = "new" | "read" | "archived";

export interface ContactRequest {
  id: string;
  phone: string;
  email: string;
  message: string;
  status: ContactRequestStatus;
  createdAt: Date;
}
