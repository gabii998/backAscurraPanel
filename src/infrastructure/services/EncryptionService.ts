import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export class EncryptionService {
  private readonly key: Buffer;

  constructor(hexKey: string) {
    if (!hexKey || hexKey.length !== 64) {
      throw new Error("ARCA_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
    }
    this.key = Buffer.from(hexKey, "hex");
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
  }

  decrypt(stored: string): string {
    const [ivHex, tagHex, ctHex] = stored.split(":");
    if (!ivHex || !tagHex || !ctHex) throw new Error("ARCA_DECRYPT_MALFORMED");
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]).toString("utf8");
  }

  isEncrypted(value: string): boolean {
    const parts = value.split(":");
    return parts.length === 3 && parts[0].length === 24;
  }
}
