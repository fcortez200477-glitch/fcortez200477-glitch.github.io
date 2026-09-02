import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middlewares/auth';
import { query } from '../../db/pool';

export const reportsRouter = Router();

/**
 * @openapi
 * /reports/punctuality:
 *   get:
 *     tags: [Relatorios Urbanos]
 *     summary: Relatorio de pontualidade por linha
 *     security: [{ bearerAuth: [] }]
 */
reportsRouter.get(
  '/punctuality',
  authenticate,
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT * FROM vw_line_punctuality ORDER BY punctuality_percent ASC NULLS LAST`,
    );
    res.json({ data: result.rows });
  }),
);

/**
 * @openapi
 * /reports/congestion:
 *   get:
 *     tags: [Relatorios Urbanos]
 *     summary: Relatorio de lentidao/congestionamento por sensor (ultimas 24h)
 *     security: [{ bearerAuth: [] }]
 */
reportsRouter.get(
  '/congestion',
  authenticate,
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT * FROM vw_traffic_congestion_24h ORDER BY avg_speed_kmh ASC NULLS LAST`,
    );
    res.json({ data: result.rows });
  }),
);

/**
 * @openapi
 * /reports/incidents-summary:
 *   get:
 *     tags: [Relatorios Urbanos]
 *     summary: Resumo de incidentes por tipo e severidade nos ultimos 30 dias
 *     security: [{ bearerAuth: [] }]
 */
reportsRouter.get(
  '/incidents-summary',
  authenticate,
  asyncHandler(async (_req, res) => {
    const result = await query(`
      SELECT type, severity, count(*) AS total
      FROM incidents
      WHERE reported_at >= now() - interval '30 days'
      GROUP BY type, severity
      ORDER BY total DESC
    `);
    res.json({ data: result.rows });
  }),
);
