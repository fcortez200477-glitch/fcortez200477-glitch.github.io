import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/auth';
import { query } from '../../db/pool';
import { pointToWkt } from '../../utils/geo';
import {
  ingestPositionSchema,
  lineIdParamSchema,
  nearbyQuerySchema,
  vehicleHistoryQuerySchema,
  vehicleIdParamSchema,
} from './transport.schemas';

export const transportRouter = Router();

/**
 * @openapi
 * /transport/lines/{lineId}/vehicles/live:
 *   get:
 *     tags: [Transporte Publico]
 *     summary: Posicoes em tempo real (ultima leitura) dos veiculos de uma linha
 *     security: [{ bearerAuth: [] }]
 */
transportRouter.get(
  '/lines/:lineId/vehicles/live',
  authenticate,
  validate({ params: lineIdParamSchema }),
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT DISTINCT ON (vp.vehicle_id)
         vp.vehicle_id,
         v.plate,
         v.status,
         ST_Y(vp.geom) AS lat,
         ST_X(vp.geom) AS lng,
         vp.speed_kmh,
         vp.heading_degrees,
         vp.recorded_at
       FROM vehicle_positions vp
       JOIN vehicles v ON v.id = vp.vehicle_id
       WHERE v.line_id = $1
       ORDER BY vp.vehicle_id, vp.recorded_at DESC`,
      [req.params.lineId],
    );
    res.json({ data: result.rows });
  }),
);

/**
 * @openapi
 * /transport/vehicles/nearby:
 *   get:
 *     tags: [Transporte Publico]
 *     summary: Busca veiculos proximos a um ponto (raio em metros) usando PostGIS
 *     security: [{ bearerAuth: [] }]
 */
transportRouter.get(
  '/vehicles/nearby',
  authenticate,
  validate({ query: nearbyQuerySchema }),
  asyncHandler(async (req, res) => {
    const { lat, lng, radiusMeters } = req.query as unknown as {
      lat: number;
      lng: number;
      radiusMeters: number;
    };
    // O raio precisa ser avaliado sobre a posicao ATUAL de cada veiculo: filtrar
    // antes de reduzir a ultima leitura faria um veiculo que ja saiu do raio
    // aparecer com uma posicao antiga.
    const result = await query(
      `WITH latest AS (
         SELECT DISTINCT ON (vp.vehicle_id)
           vp.vehicle_id, vp.geom, vp.recorded_at
         FROM vehicle_positions vp
         ORDER BY vp.vehicle_id, vp.recorded_at DESC
       )
       SELECT
         l.vehicle_id,
         v.plate,
         ST_Y(l.geom) AS lat,
         ST_X(l.geom) AS lng,
         ST_Distance(l.geom::geography, ST_MakePoint($1, $2)::geography) AS distance_meters,
         l.recorded_at
       FROM latest l
       JOIN vehicles v ON v.id = l.vehicle_id
       WHERE ST_DWithin(l.geom::geography, ST_MakePoint($1, $2)::geography, $3)
       ORDER BY distance_meters ASC`,
      [lng, lat, radiusMeters],
    );
    res.json({ data: result.rows });
  }),
);

/**
 * @openapi
 * /transport/vehicles/{vehicleId}/history:
 *   get:
 *     tags: [Transporte Publico]
 *     summary: Historico de posicoes de um veiculo
 *     security: [{ bearerAuth: [] }]
 */
transportRouter.get(
  '/vehicles/:vehicleId/history',
  authenticate,
  validate({ params: vehicleIdParamSchema, query: vehicleHistoryQuerySchema }),
  asyncHandler(async (req, res) => {
    const { from, to, limit } = req.query as unknown as { from?: string; to?: string; limit: number };
    const conditions = ['vehicle_id = $1'];
    const params: unknown[] = [req.params.vehicleId];
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
      `SELECT ST_Y(geom) AS lat, ST_X(geom) AS lng, speed_kmh, heading_degrees, recorded_at
       FROM vehicle_positions
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
 * /transport/positions:
 *   post:
 *     tags: [Transporte Publico]
 *     summary: Ingesta uma nova posicao de veiculo (usado por rastreadores embarcados)
 *     security: [{ bearerAuth: [] }]
 */
transportRouter.post(
  '/positions',
  authenticate,
  authorize('admin', 'operator'),
  validate({ body: ingestPositionSchema }),
  asyncHandler(async (req, res) => {
    const { vehicleId, routeId, position, speedKmh, headingDegrees, recordedAt } = req.body;
    const result = await query(
      `INSERT INTO vehicle_positions (vehicle_id, route_id, geom, speed_kmh, heading_degrees, recorded_at)
       VALUES ($1, $2, ST_GeomFromEWKT($3), $4, $5, COALESCE($6, now()))
       RETURNING id, vehicle_id, recorded_at`,
      [vehicleId, routeId ?? null, pointToWkt(position), speedKmh ?? null, headingDegrees ?? null, recordedAt ?? null],
    );
    res.status(201).json(result.rows[0]);
  }),
);

/**
 * @openapi
 * /transport/lines/{lineId}/routes:
 *   get:
 *     tags: [Transporte Publico]
 *     summary: Retorna as rotas (tracados) de uma linha em formato GeoJSON
 *     security: [{ bearerAuth: [] }]
 */
transportRouter.get(
  '/lines/:lineId/routes',
  authenticate,
  validate({ params: lineIdParamSchema }),
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT id, name, direction, ST_AsGeoJSON(geom)::json AS geometry
       FROM routes WHERE line_id = $1`,
      [req.params.lineId],
    );
    res.json({ data: result.rows });
  }),
);
