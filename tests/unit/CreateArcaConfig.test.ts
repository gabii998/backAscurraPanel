import { CreateArcaConfig } from "../../src/application/use-cases/CreateArcaConfig";
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

const makeRepo = (): ArcaConfigRepository => ({
  list:                        jest.fn(),
  listWithApiKeys:             jest.fn(),
  getById:                     jest.fn(),
  getByApiKeyId:               jest.fn(),
  create:                      jest.fn().mockResolvedValue(baseConfig),
  update:                      jest.fn(),
  delete:                      jest.fn(),
  assignApiKey:                jest.fn(),
  unassignApiKey:              jest.fn(),
  updateCertExpiryNotifiedAt:  jest.fn(),
});

describe("CreateArcaConfig", () => {
  it("returns public config without cert or privateKey", async () => {
    const result = await new CreateArcaConfig(makeRepo()).execute({
      name: "test", cuit: "20123456789", cert: "CERT", privateKey: "KEY", production: false,
    });
    expect(result).not.toHaveProperty("cert");
    expect(result).not.toHaveProperty("privateKey");
    expect(result.name).toBe("test");
  });

  it("returns empty apiKeys on create", async () => {
    const result = await new CreateArcaConfig(makeRepo()).execute({
      name: "test", cuit: "20123456789", cert: "CERT", privateKey: "KEY", production: false,
    });
    expect(result.apiKeys).toEqual([]);
  });

  it("throws MISSING_FIELDS when name is empty", async () => {
    const repo = makeRepo();
    await expect(
      new CreateArcaConfig(repo).execute({ name: "", cuit: "20123456789", cert: "CERT", privateKey: "KEY", production: false })
    ).rejects.toThrow("MISSING_FIELDS");
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("throws MISSING_FIELDS when cert is empty", async () => {
    const repo = makeRepo();
    await expect(
      new CreateArcaConfig(repo).execute({ name: "x", cuit: "20123456789", cert: "", privateKey: "KEY", production: false })
    ).rejects.toThrow("MISSING_FIELDS");
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("throws MISSING_FIELDS when privateKey is empty", async () => {
    const repo = makeRepo();
    await expect(
      new CreateArcaConfig(repo).execute({ name: "x", cuit: "20123456789", cert: "CERT", privateKey: "", production: false })
    ).rejects.toThrow("MISSING_FIELDS");
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("throws MISSING_FIELDS when cuit is empty", async () => {
    const repo = makeRepo();
    await expect(
      new CreateArcaConfig(repo).execute({ name: "x", cuit: "", cert: "CERT", privateKey: "KEY", production: false })
    ).rejects.toThrow("MISSING_FIELDS");
    expect(repo.create).not.toHaveBeenCalled();
  });
});
