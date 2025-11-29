import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis';
import env from '../config/env';
import { Request, Response, NextFunction } from 'express';

let limiter: ReturnType<typeof rateLimit>;

export const initRateLimiter = () => {
  limiter = rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    limit: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
    message: { message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const rateLimiterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!limiter) {
    console.warn('Rate limiter not initialized yet, skipping...');
    return next();
  }
  return limiter(req, res, next);
};

export default rateLimiterMiddleware;