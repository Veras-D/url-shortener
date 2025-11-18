import { Router, RequestHandler } from 'express';
import { urlController } from './url.controller';
import { validateSchema } from '../../common/middlewares/validateSchema';
import { shortenUrlSchema } from './url.validation';

const createUrlRoutes = (limiter: RequestHandler): Router => {
  const urlRoutes = Router();

  urlRoutes.post(
    '/shorten',
    limiter,
    validateSchema(shortenUrlSchema),
    urlController.shortenUrl
  );

  return urlRoutes;
};

export { createUrlRoutes };