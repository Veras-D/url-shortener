import { generateShortCode } from '../../libs/shortener';
import Url, { IUrl } from './url.model';
import { AppError } from '../../common/errors';
import { Types } from 'mongoose';
import { get, set, del, incrementScore, getTopUrls, removeLowestRankingUrls, redisClient } from '@config/redis';
import env from '@config/env';

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

export const createShortUrl = async (originalUrl: string, userId: string | Types.ObjectId): Promise<IUrl> => {
  if (!isValidUrl(originalUrl)) {
    throw new AppError('Invalid URL format.', 400);
  }

  const shortCode = await generateShortCode();

  let finalUserId: Types.ObjectId;
  if (typeof userId === 'string') {
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

const TOP_N_URLS = parseInt(env.TOP_N_URLS || '100', 10);

export const findByShortCode = async (shortCode: string): Promise<IUrl> => {
  const cacheKey = `url:cache:${shortCode}`;
  const cachedUrl = await get(cacheKey);

  if (cachedUrl) {
    await incrementScore('hot:urls', shortCode);
    return JSON.parse(cachedUrl);
  }

  const url = await Url.findOne({ shortCode });
  if (!url) {
    throw new AppError('Short URL not found.', 404);
  }

  await set(cacheKey, JSON.stringify(url));
  await incrementScore('hot:urls', shortCode);

  // Evict low-ranking URLs if cache exceeds limit
  const topUrls = await getTopUrls('hot:urls', TOP_N_URLS);
  if (topUrls.length > TOP_N_URLS) {
    await removeLowestRankingUrls('hot:urls', topUrls.length - TOP_N_URLS);
  }

  return url;
};

export const deleteUrl = async (shortCode: string): Promise<void> => {
  const url = await Url.findOneAndDelete({ shortCode });
  if (!url) {
    throw new AppError('Short URL not found.', 404);
  }

  const cacheKey = `url:cache:${shortCode}`;
  await del(cacheKey);
  await redisClient.zRem('hot:urls', shortCode);
};

export const incrementVisitCount = async (shortCode: string): Promise<void> => {
  await Url.updateOne({ shortCode }, { $inc: { visitCount: 1 } });
};
