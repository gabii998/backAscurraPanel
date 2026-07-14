import { X509Certificate } from "crypto";

export function parseCertExpiry(pem: string): Date | null {
  try {
    return new Date(new X509Certificate(pem).validTo);
  } catch {
    return null;
  }
}
