import dotenv from 'dotenv';

dotenv.config();

interface IEnvConfig {
  PORT: number;
  MONGO_URI: string;
  REDIS_URL: string;
  RABBITMQ_URL: string;
}

const env: IEnvConfig = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/url-shortener',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
};

export default env;
