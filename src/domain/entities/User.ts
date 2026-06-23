export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  initials: string;
  color: string;
  bio: string;
  createdAt: Date;
  deletedAt: Date | null;
}
