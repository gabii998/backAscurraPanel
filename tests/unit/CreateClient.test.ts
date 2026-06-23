import { CreateClient } from "../../src/application/use-cases/CreateClient";
import type { ClientRepository } from "../../src/domain/repositories/ClientRepository";
import type { Client } from "../../src/domain/entities/Client";

const makeRepo = (): ClientRepository => ({
  findById: jest.fn(),
  list: jest.fn(),
  create: jest.fn().mockImplementation(async (c: Client) => c),
  update: jest.fn(),
  softDelete: jest.fn(),
});

describe("CreateClient", () => {
  it("creates a client with prospect status by default", async () => {
    const repo = makeRepo();
    const uc = new CreateClient(repo);

    const client = await uc.execute({
      company: "Acme Corp",
      industry: "Tecnología",
      contactName: "Juan Pérez",
      contactEmail: "juan@acme.com",
      initials: "AC",
      color: "#6366f1",
    });

    expect(client.company).toBe("Acme Corp");
    expect(client.status).toBe("prospect");
    expect(client.projectIds).toEqual([]);
    expect(client.contractSince).toBeNull();
    expect(repo.create).toHaveBeenCalledTimes(1);
  });
});
