import { AssignApiKeyToArcaConfig } from "../../src/application/use-cases/AssignApiKeyToArcaConfig";
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
  update:                      jest.fn(),
  delete:                      jest.fn(),
  assignApiKey:                jest.fn().mockResolvedValue(undefined),
  unassignApiKey:              jest.fn(),
  updateCertExpiryNotifiedAt:  jest.fn(),
  ...overrides,
});

describe("AssignApiKeyToArcaConfig", () => {
  it("calls assignApiKey when config exists", async () => {
    const repo = makeRepo();
    await new AssignApiKeyToArcaConfig(repo).execute("cfg-1", "key-1");
    expect(repo.assignApiKey).toHaveBeenCalledWith("cfg-1", "key-1");
  });

  it("throws ARCA_CONFIG_NOT_FOUND when config does not exist", async () => {
    const repo = makeRepo({ getById: jest.fn().mockResolvedValue(null) });
    await expect(new AssignApiKeyToArcaConfig(repo).execute("missing", "key-1"))
      .rejects.toThrow("ARCA_CONFIG_NOT_FOUND");
    expect(repo.assignApiKey).not.toHaveBeenCalled();
  });
});
