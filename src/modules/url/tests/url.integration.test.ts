import request from 'supertest';
import app from '../../../app';
import { connectDB, disconnectDB } from '../../../config/mongo';
import { connectRabbitMQ, disconnectRabbitMQ } from '../../../config/rabbitmq';
import { connectRedis, disconnectRedis } from '../../../config/redis';
import Url from '../url.model';

describe('URL Integration Tests', () => {
  beforeAll(async () => {
    await connectDB();
    await connectRabbitMQ();
    await connectRedis();
  });

  afterAll(async () => {
    await Url.deleteMany({});
    await disconnectDB();
    await disconnectRabbitMQ();
    await disconnectRedis();
  });

  describe('POST /api/shorten', () => {
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

  describe('GET /:shortCode', () => {
    it('should redirect to the original URL for a valid short code', async () => {
      const createResponse = await request(app)
        .post('/api/shorten')
        .send({ url: 'https://www.example.com' });

      const shortCode = createResponse.body.shortCode;

      const redirectResponse = await request(app).get(`/${shortCode}`);

      expect(redirectResponse.status).toBe(301);
      expect(redirectResponse.headers.location).toBe('https://www.example.com');
    });

    it('should return a 404 error for a non-existent short code', async () => {
      const response = await request(app).get('/nonexistent');
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/urls/:shortCode', () => {
    it('should delete a URL and return a 204 status', async () => {
      const createResponse = await request(app)
        .post('/api/shorten')
        .send({ url: 'https://www.example.com/to-be-deleted' });

      const shortCode = createResponse.body.shortCode;

      const deleteResponse = await request(app).delete(`/api/urls/${shortCode}`);
      expect(deleteResponse.status).toBe(204);

      const getResponse = await request(app).get(`/${shortCode}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return a 404 error for a non-existent short code', async () => {
      const response = await request(app).delete('/api/urls/nonexistent');
      expect(response.status).toBe(404);
    });
  });
});
