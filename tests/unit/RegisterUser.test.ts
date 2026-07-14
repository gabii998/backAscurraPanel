import { RegisterUser } from "../../src/application/use-cases/RegisterUser";
import type { UserRepository } from "../../src/domain/repositories/UserRepository";
import type { PasswordHasher } from "../../src/application/services/PasswordHasher";
import type { TokenService } from "../../src/application/services/TokenService";

const makeRepo = (overrides: Partial<UserRepository> = {}): UserRepository => ({
  findById:             jest.fn().mockResolvedValue(null),
  findByEmail:          jest.fn().mockResolvedValue(null),
  create:               jest.fn().mockImplementation(async (u) => u),
  list:                 jest.fn().mockResolvedValue([]),
  softDelete:           jest.fn().mockResolvedValue(undefined),
  updateProfile:        jest.fn(),
  changePassword:       jest.fn(),
  getNotifications:     jest.fn(),
  updateNotifications:  jest.fn(),
  setResetToken:        jest.fn(),
  findByResetToken:     jest.fn(),
  clearResetToken:      jest.fn(),
  ...overrides,
});

const makeHasher = (): PasswordHasher => ({
  hash: jest.fn().mockReturnValue("hashed"),
  compare: jest.fn(),
});

const makeToken = (): TokenService => ({
  generate: jest.fn().mockReturnValue({ token: "token123", jti: "j1", expiresAt: new Date() }),
  verify: jest.fn(),
});

describe("RegisterUser", () => {
  it("creates a user and returns token", async () => {
    const repo = makeRepo();
    const uc = new RegisterUser(repo, makeHasher(), makeToken());

    const result = await uc.execute({
      name: "Ana García",
      email: "ana@example.com",
      password: "secret",
      initials: "AG",
      color: "#3b82f6",
    });

    expect(result.token).toBe("token123");
    expect(result.user.email).toBe("ana@example.com");
    expect(result.user.password).toBe("hashed");
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it("throws EMAIL_TAKEN when email already exists", async () => {
    const repo = makeRepo({
      findByEmail: jest.fn().mockResolvedValue({ id: "existing" }),
    });
    const uc = new RegisterUser(repo, makeHasher(), makeToken());

    await expect(
      uc.execute({ name: "X", email: "taken@example.com", password: "p", initials: "X", color: "#000" })
    ).rejects.toThrow("EMAIL_TAKEN");
  });

  it("defaults role to member", async () => {
    const repo = makeRepo();
    const uc = new RegisterUser(repo, makeHasher(), makeToken());

    const { user } = await uc.execute({
      name: "Bob",
      email: "bob@example.com",
      password: "pass",
      initials: "B",
      color: "#fff",
    });

    expect(user.role).toBe("member");
  });
});
