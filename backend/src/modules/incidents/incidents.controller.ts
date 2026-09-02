import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/auth';
import { query } from '../../db/pool';
import { HttpError } from '../../utils/http-error';
import { paginationToSql, pointToWkt } from '../../utils/geo';
import {
  createIncidentSchema,
  idParamSchema,
  listIncidentsQuerySchema,
  updateIncidentSchema,
} from './incidents.schemas';

export const incidentsRouter = Router();

/**
 * @openapi
 * /incidents:
 *   get:
 *     tags: [Incidentes]
 *     summary: Lista incidentes na via, com filtros por status/severidade/tipo
 *     security: [{ bearerAuth: [] }]
 */
incidentsRouter.get(
  '/',
  authenticate,
  validate({ query: listIncidentsQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, status, severity, type } = req.query as unknown as {
      page: number;
      pageSize: number;
      status?: string;
      severity?: string;
      type?: string;
    };
    const { limit, offset } = paginationToSql(page, pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];
    for (const [column, value] of [
      ['status', status],
      ['severity', severity],
      ['type', type],
    ] as const) {
      if (value) {
        params.push(value);
        conditions.push(`${column} = $${params.length}`);
      }
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT id, type, description, severity, status, road_name,
              ST_Y(geom) AS lat, ST_X(geom) AS lng, reported_at, resolved_at
       FROM incidents ${where}
       ORDER BY reported_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json({ data: result.rows, page, pageSize });
  }),
);

/**
 * @openapi
 * /incidents:
 *   post:
 *     tags: [Incidentes]
 *     summary: Registra um novo incidente na via
 *     security: [{ bearerAuth: [] }]
 */
incidentsRouter.post(
  '/',
  authenticate,
  validate({ body: createIncidentSchema }),
  asyncHandler(async (req, res) => {
    const { type, description, severity, position, roadName } = req.body;
    const result = await query(
      `INSERT INTO incidents (type, description, severity, geom, road_name, reported_by)
       VALUES ($1, $2, $3, ST_GeomFromEWKT($4), $5, $6)
       RETURNING id, type, description, severity, status, reported_at`,
      [type, description, severity, pointToWkt(position), roadName ?? null, req.user!.id === 'device' ? null : req.user!.id],
    );
    res.status(201).json(result.rows[0]);
  }),
);

/**
 * @openapi
 * /incidents/{id}:
 *   patch:
 *     tags: [Incidentes]
 *     summary: Atualiza status/severidade de um incidente
 *     security: [{ bearerAuth: [] }]
 */
incidentsRouter.patch(
  '/:id',
  authenticate,
  authorize('admin', 'operator'),
  validate({ params: idParamSchema, body: updateIncidentSchema }),
  asyncHandler(async (req, res) => {
    const entries = Object.entries(req.body as Record<string, unknown>);
    if (entries.length === 0) throw HttpError.badRequest('Nenhum campo para atualizar');

    const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`);
    const values = entries.map(([, value]) => value);

    const resolvedAtClause =
      req.body.status === 'resolved' ? ', resolved_at = now()' : '';

    values.push(req.params.id);
    const result = await query(
      `UPDATE incidents SET ${setClauses.join(', ')}${resolvedAtClause}
       WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (result.rowCount === 0) throw HttpError.notFound('Incidente nao encontrado');
    res.json(result.rows[0]);
  }),
);

/**
 * @openapi
 * /incidents/nearby:
 *   get:
 *     tags: [Incidentes]
 *     summary: Lista incidentes abertos proximos a um ponto
 *     security: [{ bearerAuth: [] }]
 */
incidentsRouter.get(
  '/nearby',
  authenticate,
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusMeters = Number(req.query.radiusMeters ?? 2000);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw HttpError.badRequest('lat e lng sao obrigatorios');
    }

    const result = await query(
      `SELECT id, type, severity, status, road_name,
              ST_Distance(geom::geography, ST_MakePoint($1, $2)::geography) AS distance_meters
       FROM incidents
       WHERE status IN ('open', 'in_progress')
         AND ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, $3)
       ORDER BY distance_meters ASC`,
      [lng, lat, radiusMeters],
    );
    res.json({ data: result.rows });
  }),
);
