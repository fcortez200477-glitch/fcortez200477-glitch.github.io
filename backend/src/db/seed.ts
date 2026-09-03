import bcrypt from 'bcryptjs';
import { pool } from './pool';
import { env } from '../config/env';
import { logger } from '../config/logger';

export async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash('Admin@123', env.BCRYPT_SALT_ROUNDS);

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    ['Administrador', 'admin@urbanmobility.local', passwordHash],
  );

  const lineResult = await pool.query(
    `INSERT INTO lines (code, name, description)
     VALUES ('L001', 'Linha Centro-Bairro', 'Linha troncal ligando o centro aos bairros leste')
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  const lineId = lineResult.rows[0].id;

  const routeResult = await pool.query(
    `INSERT INTO routes (line_id, name, direction, geom)
     VALUES ($1, 'Centro -> Bairro Leste', 'outbound',
       ST_GeomFromText('LINESTRING(-46.6333 -23.5505, -46.6250 -23.5490, -46.6150 -23.5470)', 4326))
     RETURNING id`,
    [lineId],
  );
  const routeId = routeResult.rows[0].id;

  await pool.query(
    `INSERT INTO vehicles (plate, type, capacity, status, line_id)
     VALUES ('ABC1D23', 'bus', 80, 'active', $1)
     ON CONFLICT (plate) DO NOTHING`,
    [lineId],
  );

  await pool.query(
    `INSERT INTO traffic_sensors (name, road_name, geom)
     VALUES ('Sensor Av. Central 01', 'Avenida Central',
       ST_GeomFromText('POINT(-46.6300 -23.5500)', 4326))`,
  );

  logger.info({ lineId, routeId }, 'Seed concluido com sucesso');
}

export async function seedIfEmpty(): Promise<void> {
  const { rows } = await pool.query<{ count: string }>('SELECT count(*) AS count FROM users');

  if (Number(rows[0].count) > 0) {
    logger.info('Base ja possui dados, seed automatico ignorado.');
    return;
  }

  await seed();
}

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      logger.error({ err }, 'Falha ao executar seed');
      process.exit(1);
    });
}
