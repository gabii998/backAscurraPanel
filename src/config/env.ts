import "dotenv/config";

const parseCsv = (value?: string): string[] =>
  value?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

export const env = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || "change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsAllowedOrigins: parseCsv(process.env.CORS_ALLOWED_ORIGINS),
  apiUrl: process.env.API_URL || "http://localhost:3000",
  arcaEncryptionKey: process.env.ARCA_ENCRYPTION_KEY ?? "",
};
