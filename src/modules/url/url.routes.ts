import { Router } from 'express';
import { urlController } from './url.controller';
import { validateSchema } from '../../common/middlewares/validateSchema';
import { shortenUrlSchema } from './url.validation';
import rateLimiter from '../../libs/rateLimiter';

const urlRoutes = Router();

urlRoutes.post(
  '/shorten',
  rateLimiter,
  validateSchema(shortenUrlSchema),
  urlController.shortenUrl
);

urlRoutes.delete('/urls/:shortCode', urlController.deleteUrl);

export { urlRoutes };
