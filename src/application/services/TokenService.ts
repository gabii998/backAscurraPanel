export interface TokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'member';
  jti: string;
}

export interface TokenResult {
  token: string;
  jti: string;
  expiresAt: Date;
}

export interface TokenService {
  generate(payload: Omit<TokenPayload, "jti">): TokenResult;
  verify(token: string): TokenPayload | null;
}
