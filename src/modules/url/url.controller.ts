import { Request, Response, NextFunction } from 'express';
import { urlService } from './url.service';

class UrlController {
  async shortenUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { url } = req.body;
      const newUrl = await urlService.createShortUrl(url);
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
