import amqp from 'amqplib';
import env from './env';

let channel: amqp.Channel | null = null;

const connectRabbitMQ = async (): Promise<void> => {
  try {
    const connection = await amqp.connect(env.RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log('RabbitMQ connected successfully.');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    process.exit(1);
  }
};

const publish = async (queue: string, message: string): Promise<void> => {
  if (!channel) {
    throw new Error('RabbitMQ channel is not available.');
  }
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(message));
};

const consume = async (queue: string, callback: (msg: amqp.ConsumeMessage | null) => void): Promise<void> => {
  if (!channel) {
    throw new Error('RabbitMQ channel is not available.');
  }
  await channel.assertQueue(queue, { durable: true });
  channel.consume(queue, callback, { noAck: true });
};

export { connectRabbitMQ, publish, consume };
