import request from 'supertest';
import createApp from '../../../app';
import createRateLimiter from '../../../libs/rateLimiter';
import { redisClient } from '../../../config/redis';
import { rateLimit } from 'express-rate-limit';

let app: any;

beforeAll(() => {
  const rateLimiter = createRateLimiter(redisClient as any);
  app = createApp(rateLimiter);
});

describe('URL Integration Tests', () => {
  describe('POST /api/shorten', () => {
    beforeEach(async () => {
      const keys = await redisClient.keys(`rl::*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    });

    it('should return a short URL for a valid URL', async () => {
      const response = await request(app)
        .post('/api/shorten')
        .send({ url: 'https://www.google.com' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('shortUrl');
      expect(response.body).toHaveProperty('shortCode');
    }, 10000);

    it('should return a 400 error for an invalid URL', async () => {
      const response = await request(app)
        .post('/api/shorten')
        .send({ url: 'invalid-url' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid URL format');
    });

    it('should return a 400 error for a missing URL', async () => {
      const response = await request(app)
        .post('/api/shorten')
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
