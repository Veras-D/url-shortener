import express from 'express';
import dotenv from 'dotenv';
import healthRoutes from '@modules/core/health.routes';
import { urlRoutes } from '@modules/url/url.routes';
import { urlController } from '@modules/url/url.controller';
import { errorHandler } from '@common/middlewares/errorHandler';

dotenv.config();

const app = express();

app.use(express.json());

app.use('/health', healthRoutes);
app.use('/api', urlRoutes);
app.get('/:shortCode', urlController.redirect);

app.use(errorHandler);

export default app;
