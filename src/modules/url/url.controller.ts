import { Request, Response, NextFunction } from 'express';
import { createShortUrl } from './url.service';

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
}

export const urlController = new UrlController();
