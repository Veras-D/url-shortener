import dotenv from 'dotenv';

if (!process.env.CI) {
  dotenv.config();
}

const requiredEnvVars = [
  'MONGO_URI',
  'REDIS_URL',
  'RABBITMQ_URL',
  'TOP_N_URLS',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Environment variable ${envVar} is not set.`);
  }
}
