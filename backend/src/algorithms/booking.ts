export type BookingQuote =
  | { possible: true; totalBundles: number; breakdown: { bundleSize: number; count: number }[] }
  | { possible: false; message: 'No exact bundle combination possible' };

/** Unbounded exact-sum minimum-coin DP, including optimal path reconstruction. O(groupSize * bundleCount). */
export function bookingQuote(bundleSizes: readonly number[], groupSize: number): BookingQuote {
  if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 10_000) {
    throw new RangeError('groupSize must be an integer between 1 and 10000');
  }
  if (bundleSizes.length < 1 || bundleSizes.length > 10 ||
      new Set(bundleSizes).size !== bundleSizes.length ||
      bundleSizes.some((size) => !Number.isInteger(size) || size < 1 || size > 500)) {
    throw new RangeError('bundleSizes must contain 1 to 10 distinct integers between 1 and 500');
  }
  const sizes = [...bundleSizes].sort((a, b) => b - a);
  const best = Array<number>(groupSize + 1).fill(Number.POSITIVE_INFINITY);
  const chosen = Array<number>(groupSize + 1).fill(0);
  best[0] = 0;
  for (let seats = 1; seats <= groupSize; seats++) {
    for (const size of sizes) {
      if (size > seats) continue;
      const candidate = best[seats - size]! + 1;
      if (candidate < best[seats]!) {
        best[seats] = candidate;
        chosen[seats] = size;
      }
    }
  }
  if (!Number.isFinite(best[groupSize])) {
    return { possible: false, message: 'No exact bundle combination possible' };
  }
  const counts = new Map<number, number>();
  for (let remaining = groupSize; remaining > 0;) {
    const size = chosen[remaining]!;
    counts.set(size, (counts.get(size) ?? 0) + 1);
    remaining -= size;
  }
  return {
    possible: true,
    totalBundles: best[groupSize]!,
    breakdown: [...counts].sort(([a], [b]) => b - a)
      .map(([bundleSize, count]) => ({ bundleSize, count })),
  };
}
