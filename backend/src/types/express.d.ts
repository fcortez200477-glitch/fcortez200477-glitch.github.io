import 'express';

export type UserRole = 'admin' | 'operator' | 'analyst' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}
