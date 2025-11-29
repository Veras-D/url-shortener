import app from './app';
import { connectDB } from '@config/mongo';
import { connectRabbitMQ } from '@config/rabbitmq';
import { connectRedis } from '@config/redis';
import { initRateLimiter } from '@libs/rateLimiter';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  await connectRabbitMQ();
  await connectRedis();
  initRateLimiter();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
