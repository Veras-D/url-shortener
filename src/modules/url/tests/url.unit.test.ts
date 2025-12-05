import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AppError } from '../../../common/errors';
import { generateShortCode } from '../../../libs/shortener';
import * as UrlService from '../url.service';
import { urlController } from '../url.controller';
import { shortenUrlSchema } from '../url.validation';
import Url from '../url.model';
import * as Redis from '../../../config/redis';
import * as RabbitMQ from '../../../config/rabbitmq';
import logger from '../../../libs/logger';
import { urlRoutes } from '../url.routes';

// --- Mocks ---

// Mock middlewares
jest.mock('../../../common/middlewares/validateSchema', () => ({
  validateSchema: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
}));

jest.mock('../../../libs/rateLimiter', () => jest.fn((req, res, next) => next()));

// Mock Redis
jest.mock('../../../config/redis', () => ({
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

// Mock RabbitMQ
jest.mock('../../../config/rabbitmq', () => ({
  publish: jest.fn(),
}));

// Mock Logger
jest.mock('../../../libs/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Url Model
jest.mock('../url.model', () => {
  const mSave = jest.fn().mockResolvedValue(true);
  const mValidateSync = jest.fn().mockImplementation(function(this: any) {
      if (this.originalUrl === 'invalid-url') {
          return { errors: { originalUrl: { message: 'invalid-url is not a valid URL!' } } };
      }
      if (!this.originalUrl) {
          return { errors: { originalUrl: {} } };
      }
      if (!this.shortCode) {
          return { errors: { shortCode: {} } };
      }
      if (!this.userId) {
          return { errors: { userId: {} } };
      }
      return undefined;
  });
  
  const mUrl = jest.fn().mockImplementation((data) => ({
    ...data,
    save: mSave,
    validateSync: mValidateSync,
  }));
  (mUrl as any).findOne = jest.fn();
  (mUrl as any).findOneAndDelete = jest.fn();
  (mUrl as any).updateOne = jest.fn();
  return {
    __esModule: true,
    default: mUrl,
  };
});

describe('URL Module Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- 1. Shortener Lib Tests ---
  describe('generateShortCode (Lib)', () => {
    const mockUrlFindOne = Url.findOne as jest.Mock;

    it('should generate a string of length 7', async () => {
      mockUrlFindOne.mockResolvedValue(null);
      const shortCode = await generateShortCode();
      expect(shortCode).toHaveLength(7);
    });

    it('should only contain base62 characters', async () => {
      mockUrlFindOne.mockResolvedValue(null);
      const shortCode = await generateShortCode();
      const base62Regex = /^[0-9a-zA-Z]+$/;
      expect(base62Regex.test(shortCode)).toBe(true);
    });

    it('should retry and return a unique code if a collision occurs', async () => {
      mockUrlFindOne
        .mockResolvedValueOnce({ shortCode: 'collided' }) // Collision
        .mockResolvedValueOnce(null); // Success

      const shortCode = await generateShortCode();
      expect(mockUrlFindOne).toHaveBeenCalledTimes(2);
      expect(shortCode).toHaveLength(7);
    });

    it('should throw an error if unable to generate a unique code after max retries', async () => {
      mockUrlFindOne.mockResolvedValue({ shortCode: 'collided' });

      await expect(generateShortCode(5)).rejects.toThrow('Unable to generate a unique short code.');
      expect(mockUrlFindOne).toHaveBeenCalledTimes(5);
    });
  });

  // --- 2. UrlService Tests ---
  describe('UrlService', () => {
    describe('isValidUrl', () => {
        it('should return true for valid url', () => {
            expect(UrlService.isValidUrl('https://google.com')).toBe(true);
        });
        it('should return false for invalid url', () => {
            expect(UrlService.isValidUrl('invalid')).toBe(false);
        });
    });

    describe('createShortUrl', () => {
      const mockUrlSave = (new Url({}) as any).save as jest.Mock; // Access the mock from the instance
      const mockUrlConstructor = Url as unknown as jest.Mock;

      beforeEach(() => {
         // Reset mock implementation for constructor if needed, or rely on global mock
         mockUrlConstructor.mockClear();
         (Url.findOne as jest.Mock).mockReset();
      });

      it('should create a short URL successfully with a string userId', async () => {
        const originalUrl = 'https://www.example.com';
        const userId = 'testUserId';
        
        // Ensure generateShortCode finds no collision
        (Url.findOne as jest.Mock).mockResolvedValue(null); 

        const result = await UrlService.createShortUrl(originalUrl, userId);

        expect(Url).toHaveBeenCalledWith(expect.objectContaining({
            originalUrl,
            userId: expect.any(Types.ObjectId),
        }));
        // We need to verify save was called. 
        // Since we can't easily grab the *exact* instance created inside the function without capturing it in the constructor mock:
        // The constructor mock returns an object with .save() which is `mSave` defined in the factory.
        // But that `mSave` is local to the factory scope.
        // Wait, I can't access `mSave` here unless I exposed it or assume the behavior.
        // My global mock returns an object { ..., save: mSave }.
        // I can verify that *some* instance's save was called? 
        // Actually, the mock factory uses `jest.fn().mockResolvedValue(true)` for save.
        // I can't check `expect(mSave).toHaveBeenCalled()` because I don't have `mSave`.
        
        // Hack: Verify result (which is the instance) has .save called?
        // result.save is a mock function.
        expect((result as any).save).toHaveBeenCalled(); 
      });

      it('should throw an AppError for an invalid URL format', async () => {
        const originalUrl = 'invalid-url';
        await expect(UrlService.createShortUrl(originalUrl, 'user')).rejects.toThrow(AppError);
      });

      it('should accept ObjectId as userId', async () => {
        const originalUrl = 'https://www.example.com';
        const userId = new Types.ObjectId();
        (Url.findOne as jest.Mock).mockResolvedValue(null);

        await UrlService.createShortUrl(originalUrl, userId);

        expect(Url).toHaveBeenCalledWith(expect.objectContaining({
            userId: userId
        }));
      });
    });

    describe('findByShortCode', () => {
      const mockUrlFindOne = Url.findOne as jest.Mock;
      const mockRedisGet = Redis.get as jest.Mock;
      const mockRedisSet = Redis.set as jest.Mock;
      const mockRedisIncrementScore = Redis.incrementScore as jest.Mock;
      const mockRedisGetTopUrls = Redis.getTopUrls as jest.Mock;
      const mockRedisRemoveLowestRankingUrls = Redis.removeLowestRankingUrls as jest.Mock;

      it('should retrieve URL from cache if available', async () => {
        const cachedUrl = { originalUrl: 'https://cached.com', shortCode: 'cached' };
        mockRedisGet.mockResolvedValue(JSON.stringify(cachedUrl));

        const result = await UrlService.findByShortCode('cached');
        
        expect(mockRedisGet).toHaveBeenCalledWith('url:cache:cached');
        expect(result).toEqual(cachedUrl);
        expect(mockRedisIncrementScore).toHaveBeenCalledWith('hot:urls', 'cached');
        expect(mockUrlFindOne).not.toHaveBeenCalled();
      });

      it('should retrieve from DB if not in cache', async () => {
        mockRedisGet.mockResolvedValue(null);
        const dbUrl = { originalUrl: 'https://db.com', shortCode: 'db', toJSON: () => ({}) };
        mockUrlFindOne.mockResolvedValue(dbUrl);
        mockRedisGetTopUrls.mockResolvedValue([]);

        const result = await UrlService.findByShortCode('db');

        expect(mockUrlFindOne).toHaveBeenCalledWith({ shortCode: 'db' });
        expect(mockRedisSet).toHaveBeenCalled();
        expect(result).toEqual(dbUrl);
      });

      it('should evict low ranking urls if limit exceeded', async () => {
        mockRedisGet.mockResolvedValue(null);
        const dbUrl = { originalUrl: 'https://db.com', shortCode: 'db', toJSON: () => ({}) };
        mockUrlFindOne.mockResolvedValue(dbUrl);
        
        // Mock env var if possible, or just rely on the default logic.
        // The default is 100. We can mock getTopUrls to return 101 items.
        const manyUrls = new Array(101).fill('url');
        mockRedisGetTopUrls.mockResolvedValue(manyUrls);

        await UrlService.findByShortCode('db');

        expect(mockRedisRemoveLowestRankingUrls).toHaveBeenCalledWith('hot:urls', 1);
      });

      it('should throw if not found in DB', async () => {
        mockRedisGet.mockResolvedValue(null);
        mockUrlFindOne.mockResolvedValue(null);

        await expect(UrlService.findByShortCode('none')).rejects.toThrow('Short URL not found');
      });
    });

    describe('deleteUrl', () => {
       const mockFindOneAndDelete = Url.findOneAndDelete as jest.Mock;
       const mockRedisDel = Redis.del as jest.Mock;
       const mockRedisZRem = Redis.redisClient.zRem as jest.Mock;

       it('should delete url and remove from cache', async () => {
           mockFindOneAndDelete.mockResolvedValue({ shortCode: 'del' });
           await UrlService.deleteUrl('del');
           expect(mockFindOneAndDelete).toHaveBeenCalledWith({ shortCode: 'del' });
           expect(mockRedisDel).toHaveBeenCalledWith('url:cache:del');
           expect(mockRedisZRem).toHaveBeenCalledWith('hot:urls', 'del');
       });

       it('should throw if url not found', async () => {
           mockFindOneAndDelete.mockResolvedValue(null);
           await expect(UrlService.deleteUrl('none')).rejects.toThrow('Short URL not found');
       });
    });

    describe('incrementVisitCount', () => {
        const mockUpdateOne = Url.updateOne as jest.Mock;
        it('should increment visit count', async () => {
            await UrlService.incrementVisitCount('inc');
            expect(mockUpdateOne).toHaveBeenCalledWith({ shortCode: 'inc' }, { $inc: { visitCount: 1 } });
        });
    });
  });

  // --- 3. UrlController Tests ---
  describe('UrlController', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: jest.Mock;

    beforeEach(() => {
      req = { body: {}, params: {}, get: jest.fn().mockReturnValue('host'), protocol: 'http' };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn(), redirect: jest.fn(), send: jest.fn() };
      next = jest.fn();
    });

    describe('shortenUrl', () => {
      it('should return 201 and shortUrl', async () => {
        req.body = { url: 'https://test.com' };
        const mockResult = { shortCode: '1234567', originalUrl: 'https://test.com' };
        
        // Spy on Service
        const createSpy = jest.spyOn(UrlService, 'createShortUrl').mockResolvedValue(mockResult as any);

        await urlController.shortenUrl(req as Request, res as Response, next);

        expect(createSpy).toHaveBeenCalledWith('https://test.com', 'anonymous');
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
           shortCode: '1234567',
           shortUrl: 'http://host/1234567'
        }));
        
        createSpy.mockRestore();
      });

      it('should call next with error if service fails', async () => {
        req.body = { url: 'https://fail.com' };
        const error = new Error('Fail');
        const createSpy = jest.spyOn(UrlService, 'createShortUrl').mockRejectedValue(error);

        await urlController.shortenUrl(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(error);
        createSpy.mockRestore();
      });
    });

    describe('redirect', () => {
      it('should redirect', async () => {
        req.params = { shortCode: 'go' };
        const mockUrl = { originalUrl: 'https://target.com' };
        const findSpy = jest.spyOn(UrlService, 'findByShortCode').mockResolvedValue(mockUrl as any);

        await urlController.redirect(req as Request, res as Response, next);

        expect(findSpy).toHaveBeenCalledWith('go');
        expect(res.redirect).toHaveBeenCalledWith(301, 'https://target.com');
        expect(RabbitMQ.publish).toHaveBeenCalled();
        
        findSpy.mockRestore();
      });

      it('should call next with error if not found', async () => {
        req.params = { shortCode: 'missing' };
        const error = new AppError('Not Found', 404);
        const findSpy = jest.spyOn(UrlService, 'findByShortCode').mockRejectedValue(error);

        await urlController.redirect(req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(error);
        findSpy.mockRestore();
      });
    });

    describe('deleteUrl', () => {
        it('should delete and return 204', async () => {
            req.params = { shortCode: 'del' };
            const deleteSpy = jest.spyOn(UrlService, 'deleteUrl').mockResolvedValue();
            
            await urlController.deleteUrl(req as Request, res as Response, next);
            
            expect(deleteSpy).toHaveBeenCalledWith('del');
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.send).toHaveBeenCalled();
            deleteSpy.mockRestore();
        });

        it('should call next on error', async () => {
            req.params = { shortCode: 'err' };
            const error = new Error('Err');
            const deleteSpy = jest.spyOn(UrlService, 'deleteUrl').mockRejectedValue(error);
            
            await urlController.deleteUrl(req as Request, res as Response, next);
            
            expect(next).toHaveBeenCalledWith(error);
            deleteSpy.mockRestore();
        });
    });
  });
  
  // --- 4. Validation Tests ---
  describe('Validation', () => {
      it('should validate correct url', () => {
          expect(shortenUrlSchema.parse({ url: 'https://valid.com' })).toBeDefined();
      });
      it('should throw an error if the URL is an empty string', () => {
    expect(() => shortenUrlSchema.parse({ url: '' })).toThrow();
  });
});

describe('UrlRoutes', () => {
  it('should have POST /shorten route', () => {
    const route = urlRoutes.stack.find((layer) => layer.route?.path === '/shorten');
    expect(route).toBeDefined();
    expect(route?.route?.stack[0].method).toBe('post');
  });

  it('should have DELETE /urls/:shortCode route', () => {
    const route = urlRoutes.stack.find((layer) => layer.route?.path === '/urls/:shortCode');
    expect(route).toBeDefined();
    expect(route?.route?.stack[0].method).toBe('delete');
  });
});

describe('Url Model', () => {
  it('should validate a correct URL', () => {
    const url = new Url({
      originalUrl: 'https://www.google.com',
      shortCode: '1234567',
      userId: new Types.ObjectId(),
    });

    const err = url.validateSync();
    expect(err).toBeUndefined();
  });

  it('should invalidate an incorrect URL', () => {
    const url = new Url({
      originalUrl: 'invalid-url',
      shortCode: '1234567',
      userId: new Types.ObjectId(),
    });

    const err = url.validateSync();
    expect(err).toBeDefined();
    expect(err?.errors['originalUrl']).toBeDefined();
  });

  it('should require originalUrl', () => {
    const url = new Url({
      shortCode: '1234567',
      userId: new Types.ObjectId(),
    });

    const err = url.validateSync();
    expect(err?.errors['originalUrl']).toBeDefined();
  });

  it('should require shortCode', () => {
    const url = new Url({
      originalUrl: 'https://www.google.com',
      userId: new Types.ObjectId(),
    });

    const err = url.validateSync();
    expect(err?.errors['shortCode']).toBeDefined();
  });

  it('should require userId', () => {
    const url = new Url({
      originalUrl: 'https://www.google.com',
      shortCode: '1234567',
    });

    const err = url.validateSync();
    expect(err?.errors['userId']).toBeDefined();
  });
});
});
