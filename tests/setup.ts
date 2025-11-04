import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'MONGO_URI',
  'REDIS_URL',
  'RABBITMQ_URL',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Environment variable ${envVar} is not set.`);
  }
}
