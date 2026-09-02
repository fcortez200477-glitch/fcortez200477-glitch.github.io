import { defineConfig } from 'vitest/config';

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.JWT_SECRET ??= 'test-secret-key-with-enough-length';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
