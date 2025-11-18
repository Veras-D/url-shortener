import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import env from '../config/env';

type MyRedisClient = ReturnType<typeof createClient>;

const createRateLimiter = (redisClient: MyRedisClient) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: 'Too many requests, please try again later.',
    },
  });
};

export default createRateLimiter;
