import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/db/pool', () => ({
  pool: { query: vi.fn(), end: vi.fn(), on: vi.fn() },
  query: vi.fn(),
  withTransaction: vi.fn(),
  checkDatabaseConnection: vi.fn(),
}));

import request from 'supertest';
import { createApp } from '../src/app';

describe('GET /health', () => {
  it('retorna status ok', async () => {
    const app = createApp();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});

describe('Rotas protegidas', () => {
  it('nega acesso sem token', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/overview/kpis');
    expect(response.status).toBe(401);
  });
});
