import bcrypt from "bcryptjs";
import type { PasswordHasher } from "../../application/services/PasswordHasher";

export class BcryptPasswordHasher implements PasswordHasher {
  hash(plain: string): string {
    return bcrypt.hashSync(plain, 10);
  }

  compare(plain: string, hashed: string): boolean {
    return bcrypt.compareSync(plain, hashed);
  }
}
