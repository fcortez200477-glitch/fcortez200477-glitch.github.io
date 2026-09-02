import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http-error';
import { logger } from '../config/logger';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { message: `Rota nao encontrada: ${req.method} ${req.originalUrl}` },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    const details = err.details instanceof ZodError ? err.details.flatten() : err.details;
    return res.status(err.statusCode).json({ error: { message: err.message, details } });
  }

  logger.error({ err }, 'Erro nao tratado');
  return res.status(500).json({ error: { message: 'Erro interno do servidor' } });
}
