import { Router } from 'express';
import { asyncHandler } from '../../../utils/async-handler';
import { validate } from '../../../middlewares/validate';
import { authenticate, authorize } from '../../../middlewares/auth';
import { query } from '../../../db/pool';
import { HttpError } from '../../../utils/http-error';
import { paginationToSql } from '../../../utils/geo';
import {
  createVehicleSchema,
  idParamSchema,
  listVehiclesQuerySchema,
  updateVehicleSchema,
} from './vehicles.schemas';

export const vehiclesRouter = Router();

const columnMap: Record<string, string> = { lineId: 'line_id' };

/**
 * @openapi
 * /vehicles:
 *   get:
 *     tags: [Cadastros]
 *     summary: Lista veiculos da frota
 *     security: [{ bearerAuth: [] }]
 */
vehiclesRouter.get(
  '/',
  authenticate,
  validate({ query: listVehiclesQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, status, lineId } = req.query as unknown as {
      page: number;
      pageSize: number;
      status?: string;
      lineId?: string;
    };
    const { limit, offset } = paginationToSql(page, pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (lineId) {
      params.push(lineId);
      conditions.push(`line_id = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT id, plate, type, capacity, status, line_id, created_at
       FROM vehicles ${where}
       ORDER BY plate
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json({ data: result.rows, page, pageSize });
  }),
);

/**
 * @openapi
 * /vehicles:
 *   post:
 *     tags: [Cadastros]
 *     summary: Cadastra um novo veiculo
 *     security: [{ bearerAuth: [] }]
 */
vehiclesRouter.post(
  '/',
  authenticate,
  authorize('admin', 'operator'),
  validate({ body: createVehicleSchema }),
  asyncHandler(async (req, res) => {
    const { plate, type, capacity, lineId } = req.body;
    const result = await query(
      `INSERT INTO vehicles (plate, type, capacity, line_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [plate, type, capacity, lineId ?? null],
    );
    res.status(201).json(result.rows[0]);
  }),
);

/**
 * @openapi
 * /vehicles/{id}:
 *   patch:
 *     tags: [Cadastros]
 *     summary: Atualiza um veiculo
 *     security: [{ bearerAuth: [] }]
 */
vehiclesRouter.patch(
  '/:id',
  authenticate,
  authorize('admin', 'operator'),
  validate({ params: idParamSchema, body: updateVehicleSchema }),
  asyncHandler(async (req, res) => {
    const entries = Object.entries(req.body as Record<string, unknown>);
    if (entries.length === 0) throw HttpError.badRequest('Nenhum campo para atualizar');

    const setClauses = entries.map(([key], i) => `${columnMap[key] ?? key} = $${i + 1}`);
    const values = entries.map(([, value]) => value);
    values.push(req.params.id);

    const result = await query(
      `UPDATE vehicles SET ${setClauses.join(', ')}, updated_at = now()
       WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (result.rowCount === 0) throw HttpError.notFound('Veiculo nao encontrado');
    res.json(result.rows[0]);
  }),
);

/**
 * @openapi
 * /vehicles/{id}:
 *   delete:
 *     tags: [Cadastros]
 *     summary: Inativa um veiculo (soft delete)
 *     security: [{ bearerAuth: [] }]
 */
vehiclesRouter.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE vehicles SET status = 'inactive', updated_at = now() WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (result.rowCount === 0) throw HttpError.notFound('Veiculo nao encontrado');
    res.status(204).send();
  }),
);
