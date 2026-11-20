import { describe, expect, it } from 'vitest';
import { formatWatchTime, parseBundleSizes, parseInteger } from '../utils';

describe('frontend validation', () => {
  it('converts comma-separated bundles into the numeric JSON array expected by POST /api/cinemas', () => {
    expect(parseBundleSizes('1, 3, 4')).toEqual([1, 3, 4]);
    expect(parseBundleSizes('20 9 6')).toEqual([20, 9, 6]);
  });
  it('rejects duplicate, out-of-range, noninteger and oversized bundle selections', () => {
    for (const value of ['1, 1', '0, 3', '501', '3.5, 1', '1, cat', '', '1,2,3,4,5,6,7,8,9,10,11']) {
      expect(() => parseBundleSizes(value)).toThrow();
    }
  });
  it('enforces movie runtime and booking group size boundaries', () => {
    expect(parseInteger('300', 'Runtime', 1, 300)).toBe(300);
    expect(() => parseInteger('301', 'Runtime', 1, 300)).toThrow();
    expect(() => parseInteger('0', 'Group size', 1, 10_000)).toThrow();
    expect(() => parseInteger('10001', 'Group size', 1, 10_000)).toThrow();
    expect(() => parseInteger('5.5', 'Group size', 1, 10_000)).toThrow();
  });
  it('formats the remaining rewatch time', () => {
    expect(formatWatchTime(420)).toBe('420 mins (7h 0m) remaining');
    expect(formatWatchTime(0)).toBe('0 mins (0h 0m) remaining');
  });
});
