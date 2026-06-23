import type { Prospect } from "../entities/Prospect";

export interface ProspectRepository {
  create(prospect: Prospect): Promise<Prospect>;
  createBulk(prospects: Prospect[]): Promise<number>;
  list(filter?: { stage?: string }): Promise<Prospect[]>;
  getById(id: string): Promise<Prospect | null>;
  update(id: string, data: Partial<Prospect>): Promise<Prospect>;
  delete(id: string): Promise<void>;
}
