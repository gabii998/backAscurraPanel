export interface UserCreateData {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'member';
  initials: string;
  color: string;
}
