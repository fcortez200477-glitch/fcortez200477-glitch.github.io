import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middlewares/auth';
import { query } from '../../db/pool';

export const overviewRouter = Router();

/**
 * @openapi
 * /overview/kpis:
 *   get:
 *     tags: [Visao Geral]
 *     summary: Indicadores gerais de desempenho da mobilidade urbana
 *     security: [{ bearerAuth: [] }]
 */
overviewRouter.get(
  '/kpis',
  authenticate,
  asyncHandler(async (_req, res) => {
    const [fleet, incidents, punctuality, traffic] = await Promise.all([
      query(`
        SELECT
          count(*) FILTER (WHERE status = 'active') AS active_vehicles,
          count(*) FILTER (WHERE status = 'maintenance') AS vehicles_in_maintenance,
          count(*) AS total_vehicles
        FROM vehicles
      `),
      query(`
        SELECT
          count(*) FILTER (WHERE status IN ('open', 'in_progress')) AS open_incidents,
          count(*) FILTER (WHERE status = 'resolved' AND resolved_at >= now() - interval '24 hours') AS resolved_last_24h,
          count(*) FILTER (WHERE severity = 'critical' AND status IN ('open', 'in_progress')) AS critical_open
        FROM incidents
      `),
      query(`SELECT round(avg(punctuality_percent), 2) AS avg_punctuality_percent FROM vw_line_punctuality`),
      query(`SELECT round(avg(avg_speed_kmh), 2) AS avg_speed_kmh FROM vw_traffic_congestion_24h`),
    ]);

    res.json({
      fleet: fleet.rows[0],
      incidents: incidents.rows[0],
      punctuality: punctuality.rows[0],
      traffic: traffic.rows[0],
      generatedAt: new Date().toISOString(),
    });
  }),
);
