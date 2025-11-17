import { Request, Response, NextFunction } from 'express';
import { createShortUrl, findByShortCode } from './url.service';
import { publish } from '@config/rabbitmq';
import logger from '@libs/logger';

class UrlController {
  async shortenUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { url } = req.body;
      // TODO: Replace with actual user ID from authentication
      const newUrl = await createShortUrl(url, 'anonymous');
      const shortUrl = `${req.protocol}://${req.get('host')}/${newUrl.shortCode}`;

      res.status(201).json({
        shortUrl,
        shortCode: newUrl.shortCode,
      });
    } catch (error) {
      next(error);
    }
  }

  async redirect(req: Request, res: Response, next: NextFunction) {
    try {
      const { shortCode } = req.params;
      const url = await findByShortCode(shortCode);

      // Don't wait for the publish to complete
      publish('url_visits', JSON.stringify({ shortCode }));

      logger.info(`Redirecting shortCode: ${shortCode} to ${url.originalUrl}`);
      res.redirect(301, url.originalUrl);
    } catch (error) {
      next(error);
    }
  }
}

export const urlController = new UrlController();
