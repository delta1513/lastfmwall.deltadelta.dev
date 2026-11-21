import type { LastFmTrack } from '@/types';

/** Returns a float in [0, 1). Injectable so layouts can be made deterministic in tests. */
export type Rng = () => number;

/** Minimum number of album tiles per column, so short lists still fill a tall screen. */
export const MIN_ROWS_PER_COLUMN = 12;

/** Unbiased Fisher-Yates shuffle (the old `sort(() => 0.5 - Math.random())` is not uniform). */
export const shuffle = <T>(items: readonly T[], rng: Rng = Math.random): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/** Drops tiles that would show the same artwork twice (Last.fm reuses one placeholder image a lot). */
export const dedupeByImage = (tracks: readonly LastFmTrack[]): LastFmTrack[] => {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    if (seen.has(track.imageUrl)) return false;
    seen.add(track.imageUrl);
    return true;
  });
};

/** Distance between two rows of a column that loops forever (the marquee repeats the column). */
export const cyclicDistance = (a: number, b: number, rows: number): number => {
  const d = Math.abs(a - b);
  return Math.min(d, rows - d);
};

/**
 * Splits tracks into `numColumns` scrolling columns.
 *
 * Each column loops, so a plain shuffle-and-deal produces visible clusters (the same album two or three
 * tiles apart, especially with ~10 albums). Instead, every tile is chosen greedily so that:
 *   1. the same album is as far as possible from itself within its (looping) column,
 *   2. it does not touch the same album in a neighbouring column,
 *   3. all albums are used about equally often.
 * Ties are broken randomly, so each call still produces a different arrangement.
 */
export const buildColumns = (
  tracks: readonly LastFmTrack[],
  numColumns: number,
  rng: Rng = Math.random,
): LastFmTrack[][] => {
  const pool = dedupeByImage(tracks);
  if (!pool.length || numColumns < 1) return [];

  const n = pool.length;
  const rows = Math.max(Math.ceil(n / numColumns), MIN_ROWS_PER_COLUMN);
  // The furthest apart two tiles can be in a loop of `rows` is rows / 2.
  const targetGap = Math.max(1, Math.min(n - 1, Math.floor(rows / 2)));

  // grid[col][row] = index into `pool`, or -1 while unfilled.
  const grid: number[][] = Array.from({ length: numColumns }, () => Array<number>(rows).fill(-1));
  const useCount = Array<number>(n).fill(0);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < numColumns; col++) {
      let best: number[] = [];
      let bestKey: [number, number, number] | null = null;

      for (let candidate = 0; candidate < n; candidate++) {
        // 1. Distance to the closest copy of this album in the same looping column.
        let gap = Infinity;
        for (let r = 0; r < row; r++) {
          if (grid[col][r] === candidate) gap = Math.min(gap, cyclicDistance(row, r, rows));
        }
        const gapScore = Math.min(gap, targetGap);

        // 2. Same album beside it (same row, or diagonal/straight neighbours in the previous row)?
        let touching = 0;
        for (let c = 0; c < col; c++) if (grid[c][row] === candidate) touching++;
        if (row > 0) {
          for (let c = Math.max(0, col - 1); c <= Math.min(numColumns - 1, col + 1); c++) {
            if (grid[c][row - 1] === candidate) touching++;
          }
        }

        // Higher is better on every axis, compared lexicographically.
        const key: [number, number, number] = [gapScore, -touching, -useCount[candidate]];
        const cmp = bestKey ? compareKeys(key, bestKey) : 1;
        if (cmp > 0) {
          bestKey = key;
          best = [candidate];
        } else if (cmp === 0) {
          best.push(candidate);
        }
      }

      const chosen = best[Math.floor(rng() * best.length)];
      grid[col][row] = chosen;
      useCount[chosen]++;
    }
  }

  return grid.map((column) => column.map((index) => pool[index]));
};

const compareKeys = (a: number[], b: number[]): number => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
};
