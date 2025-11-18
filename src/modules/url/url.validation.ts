import { z } from 'zod';

export const shortenUrlSchema = z.object({
  url: z.string().url({ message: 'Invalid URL format' }),
  userId: z.string({ required_error: 'User ID is required' }),
});
