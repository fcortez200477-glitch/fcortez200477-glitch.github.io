import { Router } from 'express';
import { asyncHandler } from '../../../utils/async-handler';
import { validate } from '../../../middlewares/validate';
import { authenticate, authorize } from '../../../middlewares/auth';
import { query } from '../../../db/pool';
import { HttpError } from '../../../utils/http-error';
import { paginationToSql } from '../../../utils/geo';
import {
  createLineSchema,
  idParamSchema,
  listLinesQuerySchema,
  updateLineSchema,
} from './lines.schemas';

export const linesRouter = Router();

/**
 * @openapi
 * /lines:
 *   get:
 *     tags: [Cadastros]
 *     summary: Lista linhas de transporte publico
 *     security: [{ bearerAuth: [] }]
 */
linesRouter.get(
  '/',
  authenticate,
  validate({ query: listLinesQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, active } = req.query as unknown as {
      page: number;
      pageSize: number;
      active?: boolean;
    };
    const { limit, offset } = paginationToSql(page, pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (active !== undefined) {
      params.push(active);
      conditions.push(`active = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT id, code, name, description, active, created_at
       FROM lines ${where}
       ORDER BY code
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json({ data: result.rows, page, pageSize });
  }),
);

/**
 * @openapi
 * /lines:
 *   post:
 *     tags: [Cadastros]
 *     summary: Cria uma nova linha
 *     security: [{ bearerAuth: [] }]
 */
linesRouter.post(
  '/',
  authenticate,
  authorize('admin', 'operator'),
  validate({ body: createLineSchema }),
  asyncHandler(async (req, res) => {
    const { code, name, description } = req.body;
    const result = await query(
      `INSERT INTO lines (code, name, description) VALUES ($1, $2, $3) RETURNING *`,
      [code, name, description ?? null],
    );
    res.status(201).json(result.rows[0]);
  }),
);

/**
 * @openapi
 * /lines/{id}:
 *   patch:
 *     tags: [Cadastros]
 *     summary: Atualiza uma linha existente
 *     security: [{ bearerAuth: [] }]
 */
linesRouter.patch(
  '/:id',
  authenticate,
  authorize('admin', 'operator'),
  validate({ params: idParamSchema, body: updateLineSchema }),
  asyncHandler(async (req, res) => {
    const entries = Object.entries(req.body as Record<string, unknown>);
    if (entries.length === 0) throw HttpError.badRequest('Nenhum campo para atualizar');

    const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`);
    const values = entries.map(([, value]) => value);
    values.push(req.params.id);

    const result = await query(
      `UPDATE lines SET ${setClauses.join(', ')}, updated_at = now()
       WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (result.rowCount === 0) throw HttpError.notFound('Linha nao encontrada');
    res.json(result.rows[0]);
  }),
);

/**
 * @openapi
 * /lines/{id}:
 *   delete:
 *     tags: [Cadastros]
 *     summary: Desativa uma linha (soft delete)
 *     security: [{ bearerAuth: [] }]
 */
linesRouter.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE lines SET active = false, updated_at = now() WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (result.rowCount === 0) throw HttpError.notFound('Linha nao encontrada');
    res.status(204).send();
  }),
);
