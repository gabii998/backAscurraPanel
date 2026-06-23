import { prisma } from "../db/prisma";
import type { Prospect } from "../../domain/entities/Prospect";
import type { ProspectRepository } from "../../domain/repositories/ProspectRepository";

function toProspect(r: NonNullable<Awaited<ReturnType<typeof prisma.prospect.findUnique>>>): Prospect {
  return {
    id:             r.id,
    name:           r.name,
    industry:       r.industry,
    city:           r.city,
    address:        r.address,
    phone:          r.phone,
    website:        r.website,
    hours:          r.hours,
    socialMedia:    r.socialMedia,
    hasWebsite:     r.hasWebsite,
    hasSocialMedia: r.hasSocialMedia,
    rating:         r.rating,
    reviewCount:    r.reviewCount,
    score:          r.score,
    scoreLabel:     r.scoreLabel,
    stage:          r.stage as Prospect["stage"],
    notes:          r.notes,
    googleId:       r.googleId,
    createdAt:      r.createdAt,
  };
}

export class PrismaProspectRepository implements ProspectRepository {
  async create(p: Prospect): Promise<Prospect> {
    const record = await prisma.prospect.create({ data: p });
    return toProspect(record);
  }

  async createBulk(prospects: Prospect[]): Promise<number> {
    let count = 0;
    for (const p of prospects) {
      if (p.googleId) {
        // Known place → upsert to refresh data on re-scrape
        await prisma.prospect.upsert({
          where:  { googleId: p.googleId },
          create: p,
          update: {
            name:           p.name,
            rating:         p.rating,
            reviewCount:    p.reviewCount,
            score:          p.score,
            scoreLabel:     p.scoreLabel,
            hasWebsite:     p.hasWebsite,
            hasSocialMedia: p.hasSocialMedia,
            website:        p.website,
            hours:          p.hours,
            socialMedia:    p.socialMedia,
            phone:          p.phone,
            address:        p.address,
          },
        });
      } else {
        // No googleId → always create (can't deduplicate without a key)
        await prisma.prospect.create({ data: { ...p, googleId: null } });
      }
      count++;
    }
    return count;
  }

  async list(filter?: { stage?: string }): Promise<Prospect[]> {
    const records = await prisma.prospect.findMany({
      where: filter?.stage ? { stage: filter.stage as Prospect["stage"] } : undefined,
      orderBy: { score: "desc" },
    });
    return records.map(toProspect);
  }

  async getById(id: string): Promise<Prospect | null> {
    const r = await prisma.prospect.findUnique({ where: { id } });
    return r ? toProspect(r) : null;
  }

  async update(id: string, data: Partial<Prospect>): Promise<Prospect> {
    const record = await prisma.prospect.update({ where: { id }, data });
    return toProspect(record);
  }

  async delete(id: string): Promise<void> {
    await prisma.prospect.delete({ where: { id } });
  }
}
