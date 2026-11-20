export interface MovieNode {
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
  prerequisites: string[];
}

/** Returns true if any node participates in a directed dependency cycle. O(V + E). */
export function hasCycle(dependencies: ReadonlyMap<string, readonly string[]>): boolean {
  const state = new Map<string, 1 | 2>(); // 1 = visiting, 2 = complete
  function visit(id: string): boolean {
    if (state.get(id) === 1) return true;
    if (state.get(id) === 2) return false;
    state.set(id, 1);
    for (const parent of dependencies.get(id) ?? []) {
      if (visit(parent)) return true;
    }
    state.set(id, 2);
    return false;
  }
  for (const id of dependencies.keys()) if (visit(id)) return true;
  return false;
}

/** Prerequisite-first DFS; returns each transitive ancestor once, never the target. */
export function rewatchOrder(movies: readonly MovieNode[], targetId: string): {
  prerequisites: MovieNode[];
  watchedCount: number;
  remainingRuntimeMinutes: number;
} {
  const byId = new Map(movies.map((movie) => [movie.id, movie]));
  const target = byId.get(targetId);
  if (!target) throw new Error(`Unknown target movie: ${targetId}`);
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: MovieNode[] = [];
  function visit(id: string): void {
    if (visiting.has(id)) throw new Error('Circular dependency in movie data');
    if (visited.has(id)) return;
    const movie = byId.get(id);
    if (!movie) throw new Error(`Unknown prerequisite movie: ${id}`);
    visiting.add(id);
    for (const prerequisite of movie.prerequisites) visit(prerequisite);
    visiting.delete(id);
    visited.add(id);
    if (id !== targetId) ordered.push(movie);
  }
  visit(targetId);
  return {
    prerequisites: ordered,
    watchedCount: ordered.filter((movie) => movie.watched).length,
    remainingRuntimeMinutes: ordered.reduce(
      (total, movie) => total + (movie.watched ? 0 : movie.runtimeMinutes), 0,
    ),
  };
}
