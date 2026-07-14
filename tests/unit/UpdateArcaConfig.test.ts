import { UpdateArcaConfig } from "../../src/application/use-cases/UpdateArcaConfig";
import type { ArcaConfigRepository } from "../../src/domain/repositories/ArcaConfigRepository";
import type { ArcaConfig } from "../../src/domain/entities/ArcaConfig";

const baseConfig: ArcaConfig = {
  id: "cfg-1",
  name: "test",
  cuit: "20123456789",
  cert: "CERT",
  privateKey: "KEY",
  production: false,
  certExpiresAt: null,
  certExpiryNotifiedAt: null,
  updatedAt: new Date(),
  createdAt: new Date(),
};

const makeRepo = (overrides: Partial<ArcaConfigRepository> = {}): ArcaConfigRepository => ({
  list:                        jest.fn(),
  listWithApiKeys:             jest.fn(),
  getById:                     jest.fn().mockResolvedValue(baseConfig),
  getByApiKeyId:               jest.fn(),
  create:                      jest.fn(),
  update:                      jest.fn().mockResolvedValue(baseConfig),
  delete:                      jest.fn(),
  assignApiKey:                jest.fn(),
  unassignApiKey:              jest.fn(),
  updateCertExpiryNotifiedAt:  jest.fn(),
  ...overrides,
});

describe("UpdateArcaConfig", () => {
  it("throws ARCA_CONFIG_NOT_FOUND when config does not exist", async () => {
    const repo = makeRepo({ getById: jest.fn().mockResolvedValue(null) });
    await expect(new UpdateArcaConfig(repo).execute("missing", { name: "x" }))
      .rejects.toThrow("ARCA_CONFIG_NOT_FOUND");
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("returns public config without cert or privateKey", async () => {
    const result = await new UpdateArcaConfig(makeRepo()).execute("cfg-1", { name: "nuevo" });
    expect(result).not.toHaveProperty("cert");
    expect(result).not.toHaveProperty("privateKey");
  });

  it("does not pass empty cert to update", async () => {
    const repo = makeRepo();
    await new UpdateArcaConfig(repo).execute("cfg-1", { name: "nuevo", cert: "" });
    const patch = (repo.update as jest.Mock).mock.calls[0][1] as Record<string, unknown>;
    expect(patch).not.toHaveProperty("cert");
  });

  it("does not pass empty privateKey to update", async () => {
    const repo = makeRepo();
    await new UpdateArcaConfig(repo).execute("cfg-1", { privateKey: "" });
    const patch = (repo.update as jest.Mock).mock.calls[0][1] as Record<string, unknown>;
    expect(patch).not.toHaveProperty("privateKey");
  });

  it("passes cert when provided", async () => {
    const repo = makeRepo();
    await new UpdateArcaConfig(repo).execute("cfg-1", { cert: "NEW_CERT" });
    const patch = (repo.update as jest.Mock).mock.calls[0][1] as Record<string, unknown>;
    expect(patch.cert).toBe("NEW_CERT");
  });

  it("returns empty apiKeys on update", async () => {
    const result = await new UpdateArcaConfig(makeRepo()).execute("cfg-1", { name: "nuevo" });
    expect(result.apiKeys).toEqual([]);
  });
});
