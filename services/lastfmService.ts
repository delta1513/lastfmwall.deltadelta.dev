import type { LastFmTrack, RawLastFmTrack } from '@/types';

const API_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
const PERIOD = '12month';
const LIMIT = 100;

// This is a static site, so the key is inlined into the bundle at build time.
// Last.fm API keys are read-only, but they are visible to anyone who views the page.
const API_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY;

export const getTopTracks = async (username: string): Promise<LastFmTrack[]> => {
  if (!API_KEY) {
    throw new Error('Site is misconfigured (missing NEXT_PUBLIC_LASTFM_API_KEY).');
  }

  const url = `${API_BASE_URL}?method=user.gettopalbums&user=${encodeURIComponent(username)}&api_key=${encodeURIComponent(API_KEY)}&format=json&period=${PERIOD}&limit=${LIMIT}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch data from Last.fm API.');
  }

  const data = await response.json();

  if (!data || data.error) {
    throw new Error('Failed to fetch data from Last.fm API.');
  }

  if (!data.topalbums || !Array.isArray(data.topalbums.album)) {
    return [];
  }

  const rawTracks: RawLastFmTrack[] = data.topalbums.album;

  return rawTracks
    .map((track) => {
      const imageUrl =
        track.image.find((img) => img.size === 'extralarge')?.['#text'] ||
        track.image.find((img) => img.size === 'large')?.['#text'] ||
        track.image.find((img) => img.size === 'medium')?.['#text'] ||
        '';
      return {
        name: track.name,
        artist: track.artist.name,
        imageUrl,
      } as LastFmTrack;
    })
    .filter((t) => Boolean(t.imageUrl));
};
