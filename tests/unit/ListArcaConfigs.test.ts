import { ListArcaConfigs } from "../../src/application/use-cases/ListArcaConfigs";
import type { ArcaConfigRepository } from "../../src/domain/repositories/ArcaConfigRepository";
import type { ArcaConfig, ArcaApiKeyRef } from "../../src/domain/entities/ArcaConfig";

const baseConfig: ArcaConfig & { apiKeys: ArcaApiKeyRef[] } = {
  id: "cfg-1",
  name: "test",
  cuit: "20123456789",
  cert: "SECRET_CERT",
  privateKey: "SECRET_KEY",
  production: false,
  certExpiresAt: null,
  certExpiryNotifiedAt: null,
  apiKeys: [],
  updatedAt: new Date(),
  createdAt: new Date(),
};

const makeRepo = (overrides: Partial<ArcaConfigRepository> = {}): ArcaConfigRepository => ({
  list:                        jest.fn(),
  listWithApiKeys:             jest.fn().mockResolvedValue([baseConfig]),
  getById:                     jest.fn(),
  getByApiKeyId:               jest.fn(),
  create:                      jest.fn(),
  update:                      jest.fn(),
  delete:                      jest.fn(),
  assignApiKey:                jest.fn(),
  unassignApiKey:              jest.fn(),
  updateCertExpiryNotifiedAt:  jest.fn(),
  ...overrides,
});

describe("ListArcaConfigs", () => {
  it("omits cert from each config", async () => {
    const [result] = await new ListArcaConfigs(makeRepo()).execute();
    expect(result).not.toHaveProperty("cert");
  });

  it("omits privateKey from each config", async () => {
    const [result] = await new ListArcaConfigs(makeRepo()).execute();
    expect(result).not.toHaveProperty("privateKey");
  });

  it("includes apiKeys array", async () => {
    const repo = makeRepo({
      listWithApiKeys: jest.fn().mockResolvedValue([
        { ...baseConfig, apiKeys: [{ id: "k1", name: "Mi Key" }] },
      ]),
    });
    const [result] = await new ListArcaConfigs(repo).execute();
    expect(result.apiKeys).toEqual([{ id: "k1", name: "Mi Key" }]);
  });

  it("returns empty array when no configs", async () => {
    const repo = makeRepo({ listWithApiKeys: jest.fn().mockResolvedValue([]) });
    const result = await new ListArcaConfigs(repo).execute();
    expect(result).toEqual([]);
  });
});
