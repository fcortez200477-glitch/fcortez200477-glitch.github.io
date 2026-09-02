import { Router } from 'express';
import { asyncHandler } from '../../../utils/async-handler';
import { validate } from '../../../middlewares/validate';
import { authenticate, authorize } from '../../../middlewares/auth';
import { query } from '../../../db/pool';
import { HttpError } from '../../../utils/http-error';
import { paginationToSql } from '../../../utils/geo';
import { idParamSchema, listUsersQuerySchema, updateUserSchema } from './users.schemas';

export const usersRouter = Router();
usersRouter.use(authenticate, authorize('admin'));

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Cadastros]
 *     summary: Lista usuarios do sistema
 *     security: [{ bearerAuth: [] }]
 */
usersRouter.get(
  '/',
  validate({ query: listUsersQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, role } = req.query as unknown as {
      page: number;
      pageSize: number;
      role?: string;
    };
    const { limit, offset } = paginationToSql(page, pageSize);

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);
    const result = await query(
      `SELECT id, name, email, role, active, created_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json({ data: result.rows, page, pageSize });
  }),
);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Cadastros]
 *     summary: Atualiza dados de um usuario
 *     security: [{ bearerAuth: [] }]
 */
usersRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateUserSchema }),
  asyncHandler(async (req, res) => {
    const fields = req.body as Record<string, unknown>;
    const entries = Object.entries(fields);
    if (entries.length === 0) {
      throw HttpError.badRequest('Nenhum campo para atualizar');
    }

    const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`);
    const values = entries.map(([, value]) => value);
    values.push(req.params.id);

    const result = await query(
      `UPDATE users SET ${setClauses.join(', ')}, updated_at = now()
       WHERE id = $${values.length}
       RETURNING id, name, email, role, active`,
      values,
    );

    if (result.rowCount === 0) throw HttpError.notFound('Usuario nao encontrado');
    res.json(result.rows[0]);
  }),
);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags: [Cadastros]
 *     summary: Desativa um usuario (soft delete)
 *     security: [{ bearerAuth: [] }]
 */
usersRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE users SET active = false, updated_at = now() WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (result.rowCount === 0) throw HttpError.notFound('Usuario nao encontrado');
    res.status(204).send();
  }),
);
