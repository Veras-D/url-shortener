import { createClient } from 'redis';
import env from './env';

const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    console.log('Redis connected successfully.');
  } catch (error) {
    console.error('Redis connection error:', error);
    process.exit(1);
  }
};

const disconnectRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    console.log('Redis disconnected successfully.');
  } catch (error) {
    console.error('Redis disconnection error:', error);
    process.exit(1);
  }
};

export { redisClient, connectRedis, disconnectRedis };
