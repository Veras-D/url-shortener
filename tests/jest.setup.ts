import dotenv from 'dotenv';
dotenv.config({ override: true });

import { connectDB, disconnectDB } from '../src/config/mongo';
import { connectRedis, redisClient } from '../src/config/redis';

beforeAll(async () => {
  await connectDB();
  await connectRedis();
  await redisClient.flushDb();
});

afterAll(async () => {
  await disconnectDB();
  if (redisClient.isOpen) {
    await redisClient.disconnect();
  }
});
