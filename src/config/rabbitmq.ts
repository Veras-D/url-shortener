import * as amqp from 'amqplib';
import env from './env';

let channel: any | null = null;
let connection: any | null = null;

const connectRabbitMQ = async (): Promise<void> => {
  try {
    connection = await amqp.connect(env.RABBITMQ_URL);
    channel = await connection.createChannel();
  } catch (error) {
    throw error;
  }
};

const disconnectRabbitMQ = async (): Promise<void> => {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
  } catch (error) {
    throw error;
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

export { connectRabbitMQ, disconnectRabbitMQ, publish, consume };
