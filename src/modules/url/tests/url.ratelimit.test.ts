import request from 'supertest';
import mongoose from 'mongoose';
import createApp from '../../../app';
import { redisClient } from '../../../config/redis';
import createRateLimiter from '../../../libs/rateLimiter';

let app: any;
const userId = new mongoose.Types.ObjectId().toHexString();

beforeAll(() => {
  const rateLimiter = createRateLimiter(redisClient as any);
  app = createApp(rateLimiter);
});

describe('URL Rate Limiting', () => {
  describe('POST /api/shorten', () => {
    const ip = '127.0.0.1';

    beforeEach(async () => {
      const keys = await redisClient.keys(`rl::${ip}`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    });

    it('should allow requests within the limit', async () => {
      const url = 'https://www.google.com';
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/shorten')
            .set('X-Forwarded-For', ip)
            .send({ url, userId })
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.headers).toHaveProperty('ratelimit-limit', '5');
      });
    }, 15000);

    it('should return a 429 error when the rate limit is exceeded', async () => {
      const url = 'https://www.google.com';

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/shorten')
          .set('X-Forwarded-For', ip)
          .send({ url, userId });
      }

      const response = await request(app)
        .post('/api/shorten')
        .set('X-Forwarded-For', ip)
        .send({ url, userId });

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty(
        'message',
        'Too many requests, please try again later.'
      );
      expect(response.headers).toHaveProperty('ratelimit-limit', '5');
      expect(response.headers).toHaveProperty('ratelimit-remaining', '0');
    }, 15000);
  });
});
