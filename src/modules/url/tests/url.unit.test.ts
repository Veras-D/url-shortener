import { generateShortCode } from '../../../libs/shortener';
import Url from '../url.model';

jest.mock('../url.model', () => ({
  findOne: jest.fn(),
}));

describe('generateShortCode', () => {
  const mockUrlFindOne = Url.findOne as jest.Mock;

  beforeEach(() => {
    mockUrlFindOne.mockReset();
  });

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
      .mockResolvedValueOnce({ shortCode: 'collided' })
      .mockResolvedValueOnce(null);

    const shortCode = await generateShortCode();
    expect(mockUrlFindOne).toHaveBeenCalledTimes(2);
    expect(shortCode).toHaveLength(7);
    const base62Regex = /^[0-9a-zA-Z]+$/;
    expect(base62Regex.test(shortCode)).toBe(true);
  });

  it('should throw an error if unable to generate a unique code after max retries', async () => {
    mockUrlFindOne.mockResolvedValue({ shortCode: 'collided' });

    await expect(generateShortCode(5)).rejects.toThrow('Unable to generate a unique short code.');
    expect(mockUrlFindOne).toHaveBeenCalledTimes(5);
  });
});