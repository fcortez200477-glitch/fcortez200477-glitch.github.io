import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/auth';
import { query } from '../../db/pool';
import { HttpError } from '../../utils/http-error';
import { pointToWkt } from '../../utils/geo';
import {
  createSensorSchema,
  ingestReadingSchema,
  readingsQuerySchema,
  sensorIdParamSchema,
} from './traffic.schemas';

export const trafficRouter = Router();

/**
 * @openapi
 * /traffic/sensors:
 *   get:
 *     tags: [Trafego]
 *     summary: Lista sensores de trafego cadastrados
 *     security: [{ bearerAuth: [] }]
 */
trafficRouter.get(
  '/sensors',
  authenticate,
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT id, name, road_name, ST_Y(geom) AS lat, ST_X(geom) AS lng, active, created_at
       FROM traffic_sensors ORDER BY name`,
    );
    res.json({ data: result.rows });
  }),
);

/**
 * @openapi
 * /traffic/sensors:
 *   post:
 *     tags: [Trafego]
 *     summary: Cadastra um novo sensor de trafego
 *     security: [{ bearerAuth: [] }]
 */
trafficRouter.post(
  '/sensors',
  authenticate,
  authorize('admin', 'operator'),
  validate({ body: createSensorSchema }),
  asyncHandler(async (req, res) => {
    const { name, roadName, position } = req.body;
    const result = await query(
      `INSERT INTO traffic_sensors (name, road_name, geom)
       VALUES ($1, $2, ST_GeomFromEWKT($3)) RETURNING id, name, road_name`,
      [name, roadName, pointToWkt(position)],
    );
    res.status(201).json(result.rows[0]);
  }),
);

/**
 * @openapi
 * /traffic/sensors/{sensorId}/readings:
 *   get:
 *     tags: [Trafego]
 *     summary: Consulta leituras historicas de um sensor
 *     security: [{ bearerAuth: [] }]
 */
trafficRouter.get(
  '/sensors/:sensorId/readings',
  authenticate,
  validate({ params: sensorIdParamSchema, query: readingsQuerySchema }),
  asyncHandler(async (req, res) => {
    const { from, to, limit } = req.query as unknown as { from?: string; to?: string; limit: number };
    const conditions = ['sensor_id = $1'];
    const params: unknown[] = [req.params.sensorId];
    if (from) {
      params.push(from);
      conditions.push(`recorded_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`recorded_at <= $${params.length}`);
    }
    params.push(limit);

    const result = await query(
      `SELECT vehicle_count, avg_speed_kmh, occupancy_percent, recorded_at
       FROM traffic_readings
       WHERE ${conditions.join(' AND ')}
       ORDER BY recorded_at DESC
       LIMIT $${params.length}`,
      params,
    );
    res.json({ data: result.rows });
  }),
);

/**
 * @openapi
 * /traffic/readings:
 *   post:
 *     tags: [Trafego]
 *     summary: Ingesta uma leitura de sensor de trafego
 *     security: [{ bearerAuth: [] }]
 */
trafficRouter.post(
  '/readings',
  authenticate,
  authorize('admin', 'operator'),
  validate({ body: ingestReadingSchema }),
  asyncHandler(async (req, res) => {
    const { sensorId, vehicleCount, avgSpeedKmh, occupancyPercent, recordedAt } = req.body;

    const sensor = await query('SELECT id FROM traffic_sensors WHERE id = $1', [sensorId]);
    if (sensor.rowCount === 0) throw HttpError.notFound('Sensor nao encontrado');

    const result = await query(
      `INSERT INTO traffic_readings (sensor_id, vehicle_count, avg_speed_kmh, occupancy_percent, recorded_at)
       VALUES ($1, $2, $3, $4, COALESCE($5, now()))
       RETURNING id, sensor_id, recorded_at`,
      [sensorId, vehicleCount, avgSpeedKmh ?? null, occupancyPercent ?? null, recordedAt ?? null],
    );
    res.status(201).json(result.rows[0]);
  }),
);
