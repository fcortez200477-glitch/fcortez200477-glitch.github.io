import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http-error';
import { logger } from '../config/logger';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { message: `Rota nao encontrada: ${req.method} ${req.originalUrl}` },
  });
}

interface PostgresError {
  code: string;
  constraint?: string;
  detail?: string;
  table?: string;
}

function isPostgresError(err: unknown): err is PostgresError {
  return typeof err === 'object' && err !== null && typeof (err as PostgresError).code === 'string';
}

/**
 * Traduz violacoes de integridade do PostgreSQL em respostas de negocio.
 * Sem isso, um cadastro com codigo/placa/e-mail repetido devolveria 500 com a
 * mensagem interna do banco, em vez de um 409 acionavel pelo cliente.
 */
/** Mensagens acionaveis para as restricoes que o usuario final consegue disparar. */
const UNIQUE_CONSTRAINT_MESSAGE: Record<string, string> = {
  lines_code_key: 'Ja existe uma linha com este codigo',
  vehicles_plate_key: 'Ja existe um veiculo com esta placa',
  users_email_key: 'Ja existe um usuario com este e-mail',
  route_stops_pk: 'Esta parada ja esta vinculada a esta rota',
};

function fromPostgresError(err: PostgresError): HttpError | null {
  switch (err.code) {
    case '23505': // unique_violation
      return HttpError.conflict(
        (err.constraint && UNIQUE_CONSTRAINT_MESSAGE[err.constraint]) ??
          'Ja existe um registro com este valor unico',
        { constraint: err.constraint },
      );
    case '23503': // foreign_key_violation
      return HttpError.badRequest('Referencia invalida: o registro relacionado nao existe', {
        constraint: err.constraint,
      });
    case '23502': // not_null_violation
      return HttpError.badRequest('Campo obrigatorio nao informado', { constraint: err.constraint });
    case '22P02': // invalid_text_representation (ex.: uuid malformado)
      return HttpError.badRequest('Formato de valor invalido');
    default:
      return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    const details = err.details instanceof ZodError ? err.details.flatten() : err.details;
    return res.status(err.statusCode).json({ error: { message: err.message, details } });
  }

  if (isPostgresError(err)) {
    const mapped = fromPostgresError(err);
    if (mapped) {
      logger.warn({ code: err.code, constraint: err.constraint }, 'Violacao de integridade no banco');
      return res
        .status(mapped.statusCode)
        .json({ error: { message: mapped.message, details: mapped.details } });
    }
  }

  logger.error({ err }, 'Erro nao tratado');
  return res.status(500).json({ error: { message: 'Erro interno do servidor' } });
}
