import { SendMail } from "../../src/application/use-cases/SendMail";
import type { MailConfigRepository } from "../../src/domain/repositories/MailConfigRepository";
import type { MailTemplateRepository } from "../../src/domain/repositories/MailTemplateRepository";
import type { MailLogRepository } from "../../src/domain/repositories/MailLogRepository";

const makeConfigRepo = (overrides: Partial<MailConfigRepository> = {}): MailConfigRepository => ({
  list:                 jest.fn(),
  getById:              jest.fn(),
  getByName:            jest.fn(),
  getByNameAndApiKeyId: jest.fn().mockResolvedValue(null),
  create:               jest.fn(),
  update:               jest.fn(),
  delete:               jest.fn(),
  ...overrides,
});

const templateRepo: MailTemplateRepository = {
  list:      jest.fn(),
  getById:   jest.fn(),
  getByName: jest.fn(),
  create:    jest.fn(),
  update:    jest.fn(),
  delete:    jest.fn(),
};

const logRepo: MailLogRepository = {
  list:   jest.fn(),
  create: jest.fn(),
};

describe("SendMail", () => {
  it("resolves mail config by name and API key", async () => {
    const configRepo = makeConfigRepo();
    const useCase = new SendMail(configRepo, templateRepo, logRepo);

    await expect(useCase.execute({
      apiKeyId: "api-key-1",
      config:   "smtp",
      to:       "to@example.com",
      subject:  "Hi",
      html:     "<p>Hi</p>",
    })).rejects.toThrow("CONFIG_NOT_FOUND");

    expect(configRepo.getByNameAndApiKeyId).toHaveBeenCalledWith("smtp", "api-key-1");
    expect(configRepo.getByName).not.toHaveBeenCalled();
  });
});
