import type { User } from "../entities/User";

export interface UserWithStats {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  color: string;
  projects: string[];
  tasksAssigned: number;
  tasksDone: number;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  list(): Promise<UserWithStats[]>;
  softDelete(id: string): Promise<void>;
  updateProfile(id: string, data: { name?: string; email?: string; role?: string; bio?: string }): Promise<User>;
  changePassword(id: string, newHash: string): Promise<void>;
  getNotifications(id: string): Promise<Record<string, boolean>>;
  updateNotifications(id: string, settings: Record<string, boolean>): Promise<void>;
  setResetToken(email: string, token: string, expiry: Date): Promise<boolean>;
  findByResetToken(token: string): Promise<User | null>;
  clearResetToken(id: string): Promise<void>;
}
