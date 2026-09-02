import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { errorHandler } from '../src/middlewares/error-handler';
import { HttpError } from '../src/utils/http-error';

function mockResponse() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: { error: { message: string } } };
}

const req = {} as Request;
const next = vi.fn();

describe('errorHandler — violacoes de integridade do PostgreSQL', () => {
  it('traduz codigo de linha duplicado em 409 com mensagem acionavel', () => {
    const res = mockResponse();
    errorHandler({ code: '23505', constraint: 'lines_code_key' }, req, res, next);

    expect(res.statusCode).toBe(409);
    expect(res.body.error.message).toBe('Ja existe uma linha com este codigo');
  });

  it('traduz placa duplicada em 409', () => {
    const res = mockResponse();
    errorHandler({ code: '23505', constraint: 'vehicles_plate_key' }, req, res, next);

    expect(res.statusCode).toBe(409);
    expect(res.body.error.message).toBe('Ja existe um veiculo com esta placa');
  });

  it('usa mensagem generica para restricao unica desconhecida', () => {
    const res = mockResponse();
    errorHandler({ code: '23505', constraint: 'alguma_outra_key' }, req, res, next);

    expect(res.statusCode).toBe(409);
    expect(res.body.error.message).toContain('valor unico');
  });

  it('traduz chave estrangeira invalida em 400', () => {
    const res = mockResponse();
    errorHandler({ code: '23503', constraint: 'vehicles_line_id_fkey' }, req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toContain('Referencia invalida');
  });

  it('traduz uuid malformado em 400', () => {
    const res = mockResponse();
    errorHandler({ code: '22P02' }, req, res, next);

    expect(res.statusCode).toBe(400);
  });

  it('mantem 500 generico para erros nao mapeados, sem vazar detalhes internos', () => {
    const res = mockResponse();
    errorHandler(new Error('connection terminated unexpectedly'), req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body.error.message).toBe('Erro interno do servidor');
  });

  it('preserva status e mensagem de HttpError', () => {
    const res = mockResponse();
    errorHandler(HttpError.forbidden('Acesso negado'), req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.error.message).toBe('Acesso negado');
  });
});
