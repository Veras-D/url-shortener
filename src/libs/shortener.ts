import { randomBytes } from 'crypto';
import Url from '../modules/url/url.model';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const alphabetLength = alphabet.length;

const generateRandomString = (length: number): string => {
  let result = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i] % alphabetLength];
  }
  return result;
};

export const generateShortCode = async (retryCount = 5): Promise<string> => {
  let shortCode = generateRandomString(7);
  let attempts = 0;

  while (attempts < retryCount) {
    const existingUrl = await Url.findOne({ shortCode });
    if (!existingUrl) {
      return shortCode;
    }
    shortCode = generateRandomString(7);
    attempts++;
  }

  throw new Error('Unable to generate a unique short code.');
};
