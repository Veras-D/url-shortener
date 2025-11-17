import { Router } from 'express';
import { urlController } from './url.controller';
import { validateSchema } from '../../common/middlewares/validateSchema';
import { shortenUrlSchema } from './url.validation';

const urlRoutes = Router();

urlRoutes.post(
  '/shorten',
  validateSchema(shortenUrlSchema),
  urlController.shortenUrl
);

urlRoutes.delete('/urls/:shortCode', urlController.deleteUrl);

export { urlRoutes };
