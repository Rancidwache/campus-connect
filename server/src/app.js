import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import api from './routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // Behind Kong / a reverse proxy, trust X-Forwarded-* so client IPs and
  // protocol are read correctly (rate limiting depends on this).
  app.set('trust proxy', env.trustProxy ? 1 : false);

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.get('/', (_req, res) =>
    res.json({ name: 'Campus Connect V2 API', version: '0.1.0', docs: '/api/health' }),
  );

  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
