import { describe, expect, it } from 'vitest';
import { bookingQuote } from '../src/algorithms/booking';
import { hasCycle, MovieNode, rewatchOrder } from '../src/algorithms/graph';

const movie = (id: string, prerequisites: string[] = [], watched = false): MovieNode => ({
  id, title: id, releaseYear: 2020, runtimeMinutes: 100, watched, prerequisites,
});
const sample = [
  movie('Iron Man'), movie('First Avenger'),
  movie('The Avengers', ['Iron Man', 'First Avenger']),
  movie('Civil War', ['The Avengers']), movie('Ragnarok'),
  movie('Infinity War', ['Civil War', 'Ragnarok']),
  movie('Endgame', ['Infinity War']), movie('Doomsday', ['Endgame']),
];

function assertPrerequisiteFirst(list: MovieNode[]) {
  const positions = new Map(list.map((entry, index) => [entry.id, index]));
  for (const entry of list) {
    for (const prerequisite of entry.prerequisites) {
      expect(positions.get(prerequisite)).toBeLessThan(positions.get(entry.id)!);
    }
  }
}

describe('topological rewatch order', () => {
  it('Doomsday has all seven ancestors, each once, in a valid order', () => {
    const result = rewatchOrder(sample, 'Doomsday');
    expect(result.prerequisites).toHaveLength(7);
    expect(new Set(result.prerequisites.map((m) => m.id)).size).toBe(7);
    expect(result.prerequisites.map((m) => m.id)).not.toContain('Doomsday');
    assertPrerequisiteFirst(result.prerequisites);
    expect(result.watchedCount).toBe(0);
    expect(result.remainingRuntimeMinutes).toBe(700);
  });
  it('Civil War puts Iron Man and First Avenger before The Avengers', () => {
    const ids = rewatchOrder(sample, 'Civil War').prerequisites.map((m) => m.id);
    expect(ids).toHaveLength(3);
    expect(ids.indexOf('Iron Man')).toBeLessThan(ids.indexOf('The Avengers'));
    expect(ids.indexOf('First Avenger')).toBeLessThan(ids.indexOf('The Avengers'));
  });
  it('Ragnarok has no prerequisites', () => {
    expect(rewatchOrder(sample, 'Ragnarok')).toEqual({
      prerequisites: [], watchedCount: 0, remainingRuntimeMinutes: 0,
    });
  });
  it('counts only watched ancestors and sums only unwatched runtimes', () => {
    const modified = sample.map((m) => ({ ...m, watched: m.id === 'Iron Man' }));
    const result = rewatchOrder(modified, 'Civil War');
    expect(result.watchedCount).toBe(1);
    expect(result.remainingRuntimeMinutes).toBe(200);
  });
  it('detects direct and indirect cycles', () => {
    expect(hasCycle(new Map([['A', ['A']]]))).toBe(true);
    expect(hasCycle(new Map([['A', ['B']], ['B', ['C']], ['C', ['A']]]))).toBe(true);
    expect(hasCycle(new Map([['A', ['B']], ['B', []]]))).toBe(false);
  });
});

describe('minimum exact bundle counts', () => {
  it.each([
    { sizes: [1, 3, 4], seats: 6, expected: [{ bundleSize: 3, count: 2 }], total: 2 },
    { sizes: [2, 5], seats: 11,
      expected: [{ bundleSize: 5, count: 1 }, { bundleSize: 2, count: 3 }], total: 4 },
    { sizes: [6, 9, 20], seats: 44,
      expected: [{ bundleSize: 20, count: 1 }, { bundleSize: 9, count: 2 }, { bundleSize: 6, count: 1 }], total: 4 },
  ])('$sizes for $seats seats', ({ sizes, seats, expected, total }) => {
    expect(bookingQuote(sizes, seats)).toEqual({
      possible: true, totalBundles: total, breakdown: expected,
    });
  });
  it('returns impossible for [4,6] and 7', () => {
    expect(bookingQuote([4, 6], 7)).toEqual({
      possible: false, message: 'No exact bundle combination possible',
    });
  });
  it('rejects invalid optimization inputs', () => {
    expect(() => bookingQuote([1, 1], 6)).toThrow(RangeError);
    expect(() => bookingQuote([1], 10_001)).toThrow(RangeError);
  });
});
