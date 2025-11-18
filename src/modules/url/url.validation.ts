import { z } from 'zod';

export const shortenUrlSchema = z.object({
  url: z.url({ message: 'Invalid URL format' }),
  userId: z.string().nonempty({ message: 'User ID is required' }),
});
