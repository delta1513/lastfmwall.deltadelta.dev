import { describe, expect, it } from 'vitest';
import {
  MIN_ROWS_PER_COLUMN,
  buildColumns,
  cyclicDistance,
  dedupeByImage,
  shuffle,
} from '@/lib/buildColumns';
import type { LastFmTrack } from '@/types';
import { makeTracks, mulberry32 } from '../utils/rng';

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

/** Smallest cyclic distance between two tiles with the same artwork within a looping column (Infinity if none). */
const minRepeatGap = (column: LastFmTrack[]): number => {
  let min = Infinity;
  for (let i = 0; i < column.length; i++) {
    for (let j = i + 1; j < column.length; j++) {
      if (column[i].imageUrl === column[j].imageUrl) {
        min = Math.min(min, cyclicDistance(i, j, column.length));
      }
    }
  }
  return min;
};

const usageCounts = (columns: LastFmTrack[][]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const tile of columns.flat()) counts.set(tile.imageUrl, (counts.get(tile.imageUrl) ?? 0) + 1);
  return counts;
};

describe('mulberry32 test helper', () => {
  it('is deterministic per seed and stays within [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 100 }, a);
    expect(seqA).toEqual(Array.from({ length: 100 }, b));
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(seqA).not.toEqual(Array.from({ length: 100 }, mulberry32(43)));
  });
});

describe('cyclicDistance', () => {
  it('is the plain distance when that is the shorter way round', () => {
    expect(cyclicDistance(2, 5, 12)).toBe(3);
    expect(cyclicDistance(5, 2, 12)).toBe(3);
  });

  it('wraps around the end of the column', () => {
    expect(cyclicDistance(0, 11, 12)).toBe(1);
    expect(cyclicDistance(1, 10, 12)).toBe(3);
  });

  it('is 0 for the same row and at most rows / 2', () => {
    expect(cyclicDistance(4, 4, 12)).toBe(0);
    expect(cyclicDistance(0, 6, 12)).toBe(6);
    expect(cyclicDistance(0, 7, 12)).toBe(5);
  });
});

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const result = shuffle(input, mulberry32(7));
    expect(input).toEqual(copy);
    expect([...result].sort((a, b) => a - b)).toEqual(copy);
  });

  it('is deterministic for a seeded rng and varies between seeds', () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    expect(shuffle(input, mulberry32(1))).toEqual(shuffle(input, mulberry32(1)));
    expect(shuffle(input, mulberry32(1))).not.toEqual(shuffle(input, mulberry32(2)));
  });

  it('handles empty and single-item arrays', () => {
    expect(shuffle([], mulberry32(1))).toEqual([]);
    expect(shuffle(['a'], mulberry32(1))).toEqual(['a']);
  });
});

describe('dedupeByImage', () => {
  it('keeps the first track for each image url, in order', () => {
    const tracks: LastFmTrack[] = [
      { name: 'a', artist: 'x', imageUrl: 'one' },
      { name: 'b', artist: 'y', imageUrl: 'two' },
      { name: 'c', artist: 'z', imageUrl: 'one' },
    ];
    expect(dedupeByImage(tracks).map((t) => t.name)).toEqual(['a', 'b']);
  });
});

describe('buildColumns', () => {
  it('returns [] for empty input', () => {
    expect(buildColumns([], 5, mulberry32(1))).toEqual([]);
  });

  it('returns [] when numColumns < 1', () => {
    expect(buildColumns(makeTracks(10), 0, mulberry32(1))).toEqual([]);
    expect(buildColumns(makeTracks(10), -2, mulberry32(1))).toEqual([]);
  });

  it('dedupes by imageUrl before laying out', () => {
    const tracks = [...makeTracks(4), ...makeTracks(4).map((t) => ({ ...t, name: `dup ${t.name}` }))];
    const columns = buildColumns(tracks, 3, mulberry32(1));
    const used = new Set(columns.flat().map((t) => t.imageUrl));
    expect(used.size).toBe(4);
    // Only the first occurrence of each artwork may be used.
    expect(columns.flat().every((t) => !t.name.startsWith('dup'))).toBe(true);
  });

  it('treats a list of identical artwork as a single album', () => {
    const same = Array.from({ length: 6 }, (_, i) => ({ name: `n${i}`, artist: 'a', imageUrl: 'placeholder' }));
    const columns = buildColumns(same, 3, mulberry32(1));
    expect(columns).toHaveLength(3);
    expect(columns.flat().every((t) => t.imageUrl === 'placeholder')).toBe(true);
  });

  it('is deterministic for a seeded rng and varies between seeds', () => {
    const tracks = makeTracks(20);
    expect(buildColumns(tracks, 5, mulberry32(9))).toEqual(buildColumns(tracks, 5, mulberry32(9)));
    expect(buildColumns(tracks, 5, mulberry32(9))).not.toEqual(buildColumns(tracks, 5, mulberry32(10)));
  });

  it('does not mutate its input', () => {
    const tracks = makeTracks(10);
    const copy = structuredClone(tracks);
    buildColumns(tracks, 3, mulberry32(1));
    expect(tracks).toEqual(copy);
  });

  it('only uses tiles from the input', () => {
    const tracks = makeTracks(7);
    const inputUrls = new Set(tracks.map((t) => t.imageUrl));
    const columns = buildColumns(tracks, 5, mulberry32(3));
    for (const tile of columns.flat()) {
      expect(inputUrls.has(tile.imageUrl)).toBe(true);
      expect(tracks).toContain(tile);
    }
  });

  it.each([
    [1, 3],
    [3, 3],
    [10, 5],
    [60, 5],
    [100, 3],
    [100, 5],
    [250, 3],
  ])('makes numColumns equal-length columns of at least MIN_ROWS_PER_COLUMN (%i albums, %i columns)', (n, cols) => {
    const columns = buildColumns(makeTracks(n), cols, mulberry32(5));
    expect(columns).toHaveLength(cols);
    const rows = columns[0].length;
    expect(rows).toBeGreaterThanOrEqual(MIN_ROWS_PER_COLUMN);
    expect(rows).toBe(Math.max(Math.ceil(n / cols), MIN_ROWS_PER_COLUMN));
    for (const column of columns) expect(column).toHaveLength(rows);
  });

  it('shows every album at least once when there are enough tiles', () => {
    for (const n of [10, 60, 100]) {
      const columns = buildColumns(makeTracks(n), 5, mulberry32(11));
      expect(new Set(columns.flat().map((t) => t.imageUrl)).size).toBe(n);
    }
  });

  describe('no repeats close together in a looping column', () => {
    // The marquee loops each column, so the last tile is followed by the first one.
    const cases: Array<[number, number]> = [
      [3, 3],
      [3, 5],
      [5, 3],
      [5, 5],
      [10, 3],
      [10, 5],
      [15, 3],
      [15, 5],
    ];

    it.each(cases)('never repeats an album back-to-back, wrap-around included (%i albums, %i columns)', (n, cols) => {
      const tracks = makeTracks(n);
      for (const seed of SEEDS) {
        const columns = buildColumns(tracks, cols, mulberry32(seed));
        for (const column of columns) {
          for (let i = 0; i < column.length; i++) {
            const next = column[(i + 1) % column.length];
            expect(next.imageUrl, `seed ${seed}, row ${i}`).not.toBe(column[i].imageUrl);
          }
        }
      }
    });

    it.each(cases)('keeps the closest repeat in a column at the algorithm\'s guaranteed gap (%i albums, %i columns)', (n, cols) => {
      // Measured over 1000 seeds: 3 albums -> 2 (5 columns) / 3 (3 columns), 5 albums -> 3, 10+ albums -> 6.
      const guaranteed = n >= 10 ? 5 : n === 5 ? 3 : 2;
      const tracks = makeTracks(n);
      for (const seed of SEEDS) {
        for (const column of buildColumns(tracks, cols, mulberry32(seed))) {
          expect(minRepeatGap(column), `seed ${seed}`).toBeGreaterThanOrEqual(guaranteed);
        }
      }
    });

    it('with 10 albums / 5 columns, same album is at least 5 tiles apart (cyclic) in every column', () => {
      const tracks = makeTracks(10);
      for (const seed of SEEDS) {
        for (const column of buildColumns(tracks, 5, mulberry32(seed))) {
          expect(column).toHaveLength(MIN_ROWS_PER_COLUMN);
          expect(minRepeatGap(column), `seed ${seed}`).toBeGreaterThanOrEqual(5);
        }
      }
    });

    // Neighbour avoidance ranks below the in-column gap, so with tiny lists (e.g. 10 albums near the
    // wrap-around rows) it can be sacrificed; with a comfortable number of albums it always holds.
    it('never shows the same album twice in one row when there are plenty of albums', () => {
      const tracks = makeTracks(30);
      for (const seed of SEEDS.slice(0, 50)) {
        const columns = buildColumns(tracks, 5, mulberry32(seed));
        for (let row = 0; row < columns[0].length; row++) {
          const urls = columns.map((c) => c[row].imageUrl);
          expect(new Set(urls).size, `seed ${seed}, row ${row}`).toBe(urls.length);
        }
      }
    });
  });

  describe('usage balance', () => {
    it.each([
      [10, 3],
      [10, 5],
      [15, 3],
      [15, 5],
      [30, 5],
    ])('uses albums roughly equally often (%i albums, %i columns)', (n, cols) => {
      const tracks = makeTracks(n);
      for (const seed of SEEDS) {
        const columns = buildColumns(tracks, cols, mulberry32(seed));
        const counts = usageCounts(columns);
        const total = columns.flat().length;
        const mean = total / n;
        expect(counts.size, `seed ${seed}`).toBe(n);
        for (const count of counts.values()) {
          expect(count, `seed ${seed}`).toBeGreaterThanOrEqual(Math.floor(mean / 2));
          expect(count, `seed ${seed}`).toBeLessThanOrEqual(Math.ceil(mean * 2));
        }
      }
    });

    it('uses all albums with small lists', () => {
      for (const n of [3, 5]) {
        for (const seed of SEEDS.slice(0, 50)) {
          const counts = usageCounts(buildColumns(makeTracks(n), 5, mulberry32(seed)));
          expect(counts.size).toBe(n);
        }
      }
    });
  });
});
