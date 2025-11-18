import { generateShortCode } from '../../libs/shortener';
import Url, { IUrl } from './url.model';
import { AppError } from '../../common/errors';
import { Types } from 'mongoose';

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

export const createShortUrl = async (originalUrl: string, userId?: string | Types.ObjectId): Promise<IUrl> => {
  if (!isValidUrl(originalUrl)) {
    throw new AppError('Invalid URL format.', 400);
  }

  const shortCode = await generateShortCode();

  let finalUserId: Types.ObjectId;
  if (typeof userId === 'string' || userId === undefined) {
    // For testing or anonymous users, generate a new ObjectId
    finalUserId = new Types.ObjectId();
  } else {
    finalUserId = userId;
  }

  const newUrl = new Url({
    originalUrl,
    shortCode,
    userId: finalUserId,
  });

  await newUrl.save();
  return newUrl;
};

export const findByShortCode = async (shortCode: string): Promise<IUrl> => {
  const url = await Url.findOne({ shortCode });
  if (!url) {
    throw new AppError('Short URL not found.', 404);
  }
  return url;
};

export const incrementVisitCount = async (shortCode: string): Promise<void> => {
  await Url.updateOne({ shortCode }, { $inc: { visitCount: 1 } });
};
