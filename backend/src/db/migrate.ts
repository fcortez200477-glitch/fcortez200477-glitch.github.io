import path from 'node:path';
import { runner } from 'node-pg-migrate';
import { env } from '../config/env';
import { logger } from '../config/logger';

export async function runMigrations(): Promise<void> {
  logger.info('Executando migrations pendentes...');

  await runner({
    databaseUrl: {
      connectionString: env.DATABASE_URL,
      ssl: env.PGSSL ? { rejectUnauthorized: false } : undefined,
    },
    dir: path.resolve(process.cwd(), 'src/db/migrations'),
    migrationsTable: 'pgmigrations',
    direction: 'up',
    logger: {
      info: (msg: string) => logger.info(msg),
      warn: (msg: string) => logger.warn(msg),
      error: (msg: string) => logger.error(msg),
    },
  });

  logger.info('Migrations em dia.');
}
