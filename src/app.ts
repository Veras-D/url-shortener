import express from 'express';
import dotenv from 'dotenv';
import healthRoutes from '@modules/core/health.routes';
import { createUrlRoutes } from '@modules/url/url.routes';
import { errorHandler } from '@common/middlewares/errorHandler';
import { rateLimit } from 'express-rate-limit';

dotenv.config();

const createApp = (rateLimiter: ReturnType<typeof rateLimit>) => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json());

  app.use('/health', healthRoutes);
  app.use('/api', createUrlRoutes(rateLimiter));

  app.use(errorHandler);

  return app;
};

export default createApp;
