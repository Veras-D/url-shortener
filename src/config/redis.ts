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

const get = async (key: string): Promise<string | null> => {
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
};

const set = async (key: string, value: string): Promise<void> => {
  try {
    await redisClient.set(key, value);
  } catch (error) {
    console.error('Redis set error:', error);
  }
};

const del = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Redis del error:', error);
  }
};

const incrementScore = async (key: string, member: string): Promise<void> => {
  try {
    await redisClient.zIncrBy(key, 1, member);
  } catch (error) {
    console.error('Redis incrementScore error:', error);
  }
};

const getTopUrls = async (key: string, count: number): Promise<string[]> => {
  try {
    return await redisClient.zRange(key, 0, count - 1, { REV: true });
  } catch (error) {
    console.error('Redis getTopUrls error:', error);
    return [];
  }
};

const removeLowestRankingUrls = async (key: string, limit: number): Promise<void> => {
  try {
    await redisClient.zRemRangeByRank(key, 0, -limit - 1);
  } catch (error) {
    console.error('Redis removeLowestRankingUrls error:', error);
  }
};

export {
  redisClient,
  connectRedis,
  disconnectRedis,
  get,
  set,
  del,
  incrementScore,
  getTopUrls,
  removeLowestRankingUrls,
};
