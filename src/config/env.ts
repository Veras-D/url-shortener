import dotenv from 'dotenv';

dotenv.config();

interface IEnvConfig {
  PORT: number;
  MONGO_URI: string;
  REDIS_URL: string;
  RABBITMQ_URL: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}

const env: IEnvConfig = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/url-shortener',
  REDIS_URL: process.env.REDIS_URL as string,
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10),
};

export default env;
