import { BulkCreateProspects } from "../../src/application/use-cases/BulkCreateProspects";
import type { Prospect } from "../../src/domain/entities/Prospect";
import type { ProspectRepository } from "../../src/domain/repositories/ProspectRepository";

const makeRepo = (): ProspectRepository => ({
  create: jest.fn(),
  createBulk: jest.fn().mockResolvedValue(1),
  list: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const result = (): Omit<Prospect, "id" | "createdAt" | "stage" | "notes"> => ({
  name: "Café Central",
  industry: "Cafetería",
  city: "Mendoza",
  address: "San Martín 1",
  phone: "+54 261 1234567",
  website: "",
  hours: "",
  socialMedia: "https://www.facebook.com/cafecentral, https://www.instagram.com/cafecentral/",
  instagramUrl: "",
  hasWebsite: false,
  hasSocialMedia: true,
  rating: 4.5,
  reviewCount: 42,
  score: 70,
  scoreLabel: "alta",
  googleId: "ChIJ123",
});

describe("BulkCreateProspects", () => {
  it("derives the Instagram URL from detected social media", async () => {
    const repo = makeRepo();

    await new BulkCreateProspects(repo).execute([result()]);

    const created = (repo.createBulk as jest.Mock).mock.calls[0][0] as Prospect[];
    expect(created[0].instagramUrl).toBe("https://www.instagram.com/cafecentral/");
  });

  it("preserves an explicitly provided Instagram URL", async () => {
    const repo = makeRepo();
    const prospect = result();
    prospect.instagramUrl = "https://www.instagram.com/cafe_central/";

    await new BulkCreateProspects(repo).execute([prospect]);

    const created = (repo.createBulk as jest.Mock).mock.calls[0][0] as Prospect[];
    expect(created[0].instagramUrl).toBe("https://www.instagram.com/cafe_central/");
  });
});
