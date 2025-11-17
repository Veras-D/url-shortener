import dotenv from 'dotenv';

dotenv.config();

interface IEnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGO_URI: string;
  REDIS_URL: string;
  RABBITMQ_URL: string;
}

const env: IEnvConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/url-shortener',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
};

export default env;
