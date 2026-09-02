import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { validate } from '../../middlewares/validate';
import { authenticate, authorize } from '../../middlewares/auth';
import { authRateLimiter } from '../../middlewares/rate-limit';
import { loginSchema, registerSchema } from './auth.schemas';
import * as authService from './auth.service';

export const authRouter = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Autentica um usuario e retorna um token JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: Login efetuado com sucesso }
 *       401: { description: Credenciais invalidas }
 */
authRouter.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json(result);
  }),
);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Cria um novo usuario (restrito a administradores)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Usuario criado }
 *       403: { description: Acesso negado }
 */
authRouter.post(
  '/register',
  authenticate,
  authorize('admin'),
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  }),
);
