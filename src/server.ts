import createApp from './app';
import { connectDB } from '@config/mongo';
import { connectRabbitMQ } from '@config/rabbitmq';
import { connectRedis, redisClient } from '@config/redis';
import createRateLimiter from './libs/rateLimiter';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  // await connectRabbitMQ();
  await connectRedis();

  const rateLimiter = createRateLimiter(redisClient as any);
  const app = createApp(rateLimiter);

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();