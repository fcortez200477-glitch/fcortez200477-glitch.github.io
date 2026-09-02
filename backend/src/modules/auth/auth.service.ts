import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../db/pool';
import { env } from '../../config/env';
import { HttpError } from '../../utils/http-error';
import type { LoginInput, RegisterInput } from './auth.schemas';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'operator' | 'analyst' | 'viewer';
  active: boolean;
}

function signToken(user: Pick<UserRow, 'id' | 'email' | 'role'>) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export async function login(input: LoginInput) {
  const result = await query<UserRow>(
    'SELECT id, name, email, password_hash, role, active FROM users WHERE email = $1',
    [input.email],
  );
  const user = result.rows[0];

  if (!user || !user.active) {
    throw HttpError.unauthorized('Credenciais invalidas');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordMatches) {
    throw HttpError.unauthorized('Credenciais invalidas');
  }

  const token = signToken(user);
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function register(input: RegisterInput) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [input.email]);
  if (existing.rowCount && existing.rowCount > 0) {
    throw HttpError.conflict('Ja existe um usuario com este e-mail');
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
  const result = await query<UserRow>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, active`,
    [input.name, input.email, passwordHash, input.role],
  );

  const user = result.rows[0];
  const token = signToken(user);
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}
