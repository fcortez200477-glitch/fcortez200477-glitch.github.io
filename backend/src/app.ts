import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { openapiSpec } from './docs/openapi';
import { apiRateLimiter } from './middlewares/rate-limit';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';

import { authRouter } from './modules/auth/auth.controller';
import { overviewRouter } from './modules/overview/overview.controller';
import { transportRouter } from './modules/transport/transport.controller';
import { trafficRouter } from './modules/traffic/traffic.controller';
import { incidentsRouter } from './modules/incidents/incidents.controller';
import { reportsRouter } from './modules/reports/reports.controller';
import { linesRouter } from './modules/registries/lines/lines.controller';
import { vehiclesRouter } from './modules/registries/vehicles/vehicles.controller';
import { usersRouter } from './modules/registries/users/users.controller';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',') }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(apiRateLimiter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get('/api/docs.json', (_req, res) => res.json(openapiSpec));

  const api = express.Router();
  api.use('/auth', authRouter);
  api.use('/overview', overviewRouter);
  api.use('/transport', transportRouter);
  api.use('/traffic', trafficRouter);
  api.use('/incidents', incidentsRouter);
  api.use('/reports', reportsRouter);
  api.use('/lines', linesRouter);
  api.use('/vehicles', vehiclesRouter);
  api.use('/users', usersRouter);

  app.use(env.API_PREFIX, api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
