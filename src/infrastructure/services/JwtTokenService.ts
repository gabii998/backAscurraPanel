import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../../config/env";
import type { TokenService, TokenPayload, TokenResult } from "../../application/services/TokenService";

export class JwtTokenService implements TokenService {
  generate(payload: Omit<TokenPayload, "jti">): TokenResult {
    const jti = randomUUID();
    const token = jwt.sign({ ...payload, jti }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
    const decoded = jwt.decode(token) as { exp?: number };
    const expiresAt = new Date((decoded.exp ?? 0) * 1000);
    return { token, jti, expiresAt };
  }

  verify(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, env.jwtSecret) as TokenPayload;
    } catch {
      return null;
    }
  }
}
