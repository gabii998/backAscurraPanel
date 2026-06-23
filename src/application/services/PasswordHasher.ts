export interface PasswordHasher {
  hash(plain: string): string;
  compare(plain: string, hashed: string): boolean;
}
