import dotenv from 'dotenv';

dotenv.config();

interface IEnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGO_URI: string;
  REDIS_URL: string;
  RABBITMQ_URL: string;
  TOP_N_URLS: string;
  RATE_LIMIT_WINDOW_MS: string;
  RATE_LIMIT_MAX_REQUESTS: string;
}

const env: IEnvConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/url-shortener',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  TOP_N_URLS: process.env.TOP_N_URLS || '100',
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || '60000',
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || '5',
};

export default env;
