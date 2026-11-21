import type { Rng } from '@/lib/buildColumns';
import type { LastFmTrack } from '@/types';

/** Small, fast seeded PRNG (mulberry32). Returns floats in [0, 1). */
export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Builds `count` distinct albums with unique image URLs. */
export const makeTracks = (count: number): LastFmTrack[] =>
  Array.from({ length: count }, (_, i) => ({
    name: `Album ${i}`,
    artist: `Artist ${i}`,
    imageUrl: `https://img.example/${i}.jpg`,
  }));
