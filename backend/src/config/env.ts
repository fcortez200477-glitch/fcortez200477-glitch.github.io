import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL e obrigatorio'),
  PGSSL: z.coerce.boolean().default(false),
  DB_POOL_MAX: z.coerce.number().default(20),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter ao menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),

  CORS_ORIGIN: z.string().default('*'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),

  DEVICE_INGEST_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Configuracao de ambiente invalida:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
