export function sortByTitle<T extends { title: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.title.localeCompare(b.title));
}

export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export function formatWatchTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${totalMinutes} mins (${hours}h ${minutes}m) remaining`;
}

/** User-friendly parse; the API requires an array of distinct integers, never a CSV string. */
export function parseBundleSizes(value: string): number[] {
  const tokens = value.trim().split(/[\s,]+/).filter(Boolean);
  if (tokens.length < 1 || tokens.length > 10) {
    throw new Error('Enter between 1 and 10 bundle sizes.');
  }
  if (tokens.some((token) => !/^\d+$/.test(token))) {
    throw new Error('Bundle sizes must be whole numbers separated by commas or spaces.');
  }
  const sizes = tokens.map(Number);
  if (sizes.some((size) => !Number.isSafeInteger(size) || size < 1 || size > 500)) {
    throw new Error('Each bundle size must be between 1 and 500.');
  }
  if (new Set(sizes).size !== sizes.length) {
    throw new Error('Bundle sizes must be unique. Remove duplicate values.');
  }
  return sizes;
}

export function parseInteger(value: string, fieldName: string, min?: number, max?: number): number {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) throw new Error(`${fieldName} must be a whole number.`);
  const numeric = Number(trimmed);
  if (!Number.isSafeInteger(numeric)) throw new Error(`${fieldName} must be a valid whole number.`);
  if (min !== undefined && numeric < min) throw new Error(`${fieldName} must be at least ${min}.`);
  if (max !== undefined && numeric > max) throw new Error(`${fieldName} cannot exceed ${max}.`);
  return numeric;
}
