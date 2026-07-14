import { LoginUser } from "../../src/application/use-cases/LoginUser";
import type { UserRepository } from "../../src/domain/repositories/UserRepository";
import type { PasswordHasher } from "../../src/application/services/PasswordHasher";
import type { TokenService } from "../../src/application/services/TokenService";
import type { User } from "../../src/domain/entities/User";

const mockUser: User = {
  id: "u1",
  name: "Ana",
  email: "ana@example.com",
  password: "hashed",
  role: "member",
  initials: "A",
  color: "#000",
  bio: "",
  createdAt: new Date(),
  deletedAt: null,
};

const makeRepo = (user: User | null = mockUser): UserRepository => ({
  findById:             jest.fn(),
  findByEmail:          jest.fn().mockResolvedValue(user),
  create:               jest.fn(),
  list:                 jest.fn(),
  softDelete:           jest.fn(),
  updateProfile:        jest.fn(),
  changePassword:       jest.fn(),
  getNotifications:     jest.fn(),
  updateNotifications:  jest.fn(),
  setResetToken:        jest.fn(),
  findByResetToken:     jest.fn(),
  clearResetToken:      jest.fn(),
});

describe("LoginUser", () => {
  it("returns user and token on valid credentials", async () => {
    const hasher: PasswordHasher = { hash: jest.fn(), compare: jest.fn().mockReturnValue(true) };
    const token: TokenService = { generate: jest.fn().mockReturnValue({ token: "jwt", jti: "j1", expiresAt: new Date() }), verify: jest.fn() };

    const uc = new LoginUser(makeRepo(), hasher, token);
    const result = await uc.execute({ email: "ana@example.com", password: "secret" });

    expect(result.token).toBe("jwt");
    expect(result.user.id).toBe("u1");
  });

  it("throws INVALID_CREDENTIALS when user not found", async () => {
    const hasher: PasswordHasher = { hash: jest.fn(), compare: jest.fn() };
    const token: TokenService = { generate: jest.fn(), verify: jest.fn() };

    const uc = new LoginUser(makeRepo(null), hasher, token);
    await expect(uc.execute({ email: "x@x.com", password: "p" })).rejects.toThrow("INVALID_CREDENTIALS");
  });

  it("throws INVALID_CREDENTIALS on wrong password", async () => {
    const hasher: PasswordHasher = { hash: jest.fn(), compare: jest.fn().mockReturnValue(false) };
    const token: TokenService = { generate: jest.fn(), verify: jest.fn() };

    const uc = new LoginUser(makeRepo(), hasher, token);
    await expect(uc.execute({ email: "ana@example.com", password: "wrong" })).rejects.toThrow("INVALID_CREDENTIALS");
  });
});
