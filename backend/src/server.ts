import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { checkDatabaseConnection, pool } from './db/pool';

async function main() {
  await checkDatabaseConnection();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Servidor ouvindo na porta ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`Documentacao disponivel em /api/docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Recebido ${signal}, encerrando servidor com seguranca...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Falha ao iniciar o servidor');
  process.exit(1);
});
