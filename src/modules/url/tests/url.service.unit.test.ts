import * as urlService from '../url.service';
import Url from '../url.model';
import { generateShortCode } from '@libs/shortener';
import { AppError } from '@common/errors';
import * as redis from '@config/redis';

jest.mock('../url.model');
jest.mock('@libs/shortener', () => ({
  generateShortCode: jest.fn(),
}));
jest.mock('@config/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incrementScore: jest.fn(),
  getTopUrls: jest.fn(),
  removeLowestRankingUrls: jest.fn(),
  redisClient: {
    zRem: jest.fn(),
  },
}));

describe('URL Service', () => {
  const mockUrlModel = Url as jest.Mocked<typeof Url>;
  const mockGenerateShortCode = generateShortCode as jest.Mock;
  const mockRedis = redis as jest.Mocked<typeof redis>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createShortUrl', () => {
    it('should create and save a new short URL', async () => {
      const originalUrl = 'https://example.com';
      const userId = 'some-user-id';
      const shortCode = '1234567';
      const mockSavedUrl = { originalUrl, userId, shortCode, save: jest.fn().mockResolvedValue(true) };

      (mockUrlModel as any).mockImplementation(() => mockSavedUrl);
      mockGenerateShortCode.mockResolvedValue(shortCode);

      const result = await urlService.createShortUrl(originalUrl, userId);

      expect(result.originalUrl).toBe(originalUrl);
      expect(result.shortCode).toBe(shortCode);
      expect(result.userId).toBe(userId);
      expect(mockSavedUrl.save).toHaveBeenCalled();
    });

    it('should throw an AppError for an invalid URL', async () => {
      const originalUrl = 'invalid-url';
      const userId = 'some-user-id';

      await expect(urlService.createShortUrl(originalUrl, userId)).rejects.toThrow(
        new AppError('Invalid URL format.', 400)
      );
    });
  });

  describe('findByShortCode', () => {
    it('should return a cached URL if found', async () => {
      const shortCode = '1234567';
      const mockUrl = { originalUrl: 'https://example.com', shortCode, userId: 'some-user-id' };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockUrl));

      const result = await urlService.findByShortCode(shortCode);

      expect(mockRedis.get).toHaveBeenCalledWith(`url:cache:${shortCode}`);
      expect(mockRedis.incrementScore).toHaveBeenCalledWith('hot:urls', shortCode);
      expect(result).toEqual(mockUrl);
      expect(mockUrlModel.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache if not found in cache', async () => {
      const shortCode = '1234567';
      const mockUrl = { originalUrl: 'https://example.com', shortCode, userId: 'some-user-id' };
      mockRedis.get.mockResolvedValue(null);
      (mockUrlModel.findOne as jest.Mock).mockResolvedValue(mockUrl);
      mockRedis.getTopUrls.mockResolvedValue([]);

      const result = await urlService.findByShortCode(shortCode);

      expect(mockRedis.get).toHaveBeenCalledWith(`url:cache:${shortCode}`);
      expect(mockUrlModel.findOne).toHaveBeenCalledWith({ shortCode });
      expect(mockRedis.set).toHaveBeenCalledWith(`url:cache:${shortCode}`, JSON.stringify(mockUrl));
      expect(mockRedis.incrementScore).toHaveBeenCalledWith('hot:urls', shortCode);
      expect(result).toEqual(mockUrl);
    });

    it('should throw an AppError if the short URL is not found', async () => {
      const shortCode = 'not-found';
      mockRedis.get.mockResolvedValue(null);
      (mockUrlModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(urlService.findByShortCode(shortCode)).rejects.toThrow(
        new AppError('Short URL not found.', 404)
      );
    });
  });

  describe('deleteUrl', () => {
    it('should delete a URL and remove it from cache', async () => {
      const shortCode = '1234567';
      (mockUrlModel.findOneAndDelete as jest.Mock).mockResolvedValue({ shortCode });

      await urlService.deleteUrl(shortCode);

      expect(mockUrlModel.findOneAndDelete).toHaveBeenCalledWith({ shortCode });
      expect(mockRedis.del).toHaveBeenCalledWith(`url:cache:${shortCode}`);
      expect(mockRedis.redisClient.zRem).toHaveBeenCalledWith('hot:urls', shortCode);
    });

    it('should throw an AppError if the short URL is not found', async () => {
      const shortCode = 'not-found';
      (mockUrlModel.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(urlService.deleteUrl(shortCode)).rejects.toThrow(
        new AppError('Short URL not found.', 404)
      );
    });
  });

  describe('incrementVisitCount', () => {
    it('should increment the visit count for a short URL', async () => {
      const shortCode = '1234567';
      (mockUrlModel.updateOne as jest.Mock).mockResolvedValue({ nModified: 1 });

      await urlService.incrementVisitCount(shortCode);

      expect(mockUrlModel.updateOne).toHaveBeenCalledWith({ shortCode }, { $inc: { visitCount: 1 } });
    });
  });
});
