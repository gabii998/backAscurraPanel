import { createHash } from "crypto";
import { CreateApiKey } from "../../src/application/use-cases/CreateApiKey";
import type { ApiKeyRepository } from "../../src/domain/repositories/ApiKeyRepository";
import type { ApiKey } from "../../src/domain/entities/ApiKey";

const makeRepo = (): ApiKeyRepository => ({
  findByKeyHash: jest.fn(),
  list: jest.fn(),
  create: jest.fn().mockImplementation(async (k: ApiKey) => k),
  revoke: jest.fn(),
});

describe("CreateApiKey", () => {
  it("returns a rawKey prefixed with aks_", async () => {
    const uc = new CreateApiKey(makeRepo());
    const { rawKey } = await uc.execute("Web App");
    expect(rawKey).toMatch(/^aks_[0-9a-f]{64}$/);
  });

  it("stores the SHA-256 hash, not the rawKey", async () => {
    const repo = makeRepo();
    const uc = new CreateApiKey(repo);
    const { rawKey } = await uc.execute("Web App");

    const expectedHash = createHash("sha256").update(rawKey).digest("hex");
    const created = (repo.create as jest.Mock).mock.calls[0][0] as ApiKey;
    expect(created.keyHash).toBe(expectedHash);
    expect(created.keyHash).not.toBe(rawKey);
  });

  it("stores the first 8 chars as prefix", async () => {
    const repo = makeRepo();
    const uc = new CreateApiKey(repo);
    const { rawKey, apiKey } = await uc.execute("Web App");
    expect(apiKey.prefix).toBe(rawKey.slice(0, 8));
  });

  it("creates with revokedAt null", async () => {
    const repo = makeRepo();
    const uc = new CreateApiKey(repo);
    const { apiKey } = await uc.execute("Web App");
    expect(apiKey.revokedAt).toBeNull();
  });
});
