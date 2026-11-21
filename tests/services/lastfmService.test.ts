import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Img = { '#text': string; size: string };

const album = (name: string, images: Img[], artist = `${name} artist`) => ({
  name,
  artist: { name: artist },
  image: images,
});

const img = (size: string, url: string): Img => ({ size, '#text': url });

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

let fetchMock: ReturnType<typeof vi.fn>;

/** The API key is read when the module loads, so each test imports a fresh copy. */
const loadService = async (apiKey: string | null = 'test-key') => {
  vi.resetModules();
  if (apiKey === null) vi.stubEnv('NEXT_PUBLIC_LASTFM_API_KEY', '');
  else vi.stubEnv('NEXT_PUBLIC_LASTFM_API_KEY', apiKey);
  return import('@/services/lastfmService');
};

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('getTopTracks', () => {
  it('throws a configuration error without calling fetch when the API key is missing', async () => {
    const { getTopTracks } = await loadService(null);
    await expect(getTopTracks('rj')).rejects.toThrow(/NEXT_PUBLIC_LASTFM_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests top albums with the encoded username and api key', async () => {
    fetchMock.mockResolvedValue(okResponse({ topalbums: { album: [] } }));
    const { getTopTracks } = await loadService('abc 123');

    await getTopTracks('some user&x=1/é');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe('https://ws.audioscrobbler.com/2.0/');
    expect(url.searchParams.get('method')).toBe('user.gettopalbums');
    expect(url.searchParams.get('user')).toBe('some user&x=1/é');
    expect(url.searchParams.get('api_key')).toBe('abc 123');
    expect(url.searchParams.get('format')).toBe('json');
    expect(url.searchParams.get('period')).toBe('12month');
    expect(url.searchParams.get('limit')).toBe('100');
    // The raw string must be encoded, not just parsed back correctly.
    expect(fetchMock.mock.calls[0][0]).toContain(`user=${encodeURIComponent('some user&x=1/é')}`);
    expect(fetchMock.mock.calls[0][0]).not.toContain('some user');
  });

  it('throws when the response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as unknown as Response);
    const { getTopTracks } = await loadService();
    await expect(getTopTracks('rj')).rejects.toThrow('Failed to fetch data from Last.fm API.');
  });

  it('throws when the payload contains an error', async () => {
    fetchMock.mockResolvedValue(okResponse({ error: 6, message: 'User not found' }));
    const { getTopTracks } = await loadService();
    await expect(getTopTracks('nobody')).rejects.toThrow('Failed to fetch data from Last.fm API.');
  });

  it('throws when the payload is empty', async () => {
    fetchMock.mockResolvedValue(okResponse(null));
    const { getTopTracks } = await loadService();
    await expect(getTopTracks('rj')).rejects.toThrow('Failed to fetch data from Last.fm API.');
  });

  it('propagates network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('network down'));
    const { getTopTracks } = await loadService();
    await expect(getTopTracks('rj')).rejects.toThrow('network down');
  });

  it.each([
    ['no topalbums key', {}],
    ['topalbums without an album list', { topalbums: {} }],
    ['album is not an array', { topalbums: { album: 'nope' } }],
  ])('returns [] when %s', async (_label, body) => {
    fetchMock.mockResolvedValue(okResponse(body));
    const { getTopTracks } = await loadService();
    await expect(getTopTracks('rj')).resolves.toEqual([]);
  });

  it('maps albums to tracks with name, artist and image url', async () => {
    fetchMock.mockResolvedValue(
      okResponse({ topalbums: { album: [album('OK Computer', [img('extralarge', 'http://i/ok.png')], 'Radiohead')] } }),
    );
    const { getTopTracks } = await loadService();
    await expect(getTopTracks('rj')).resolves.toEqual([
      { name: 'OK Computer', artist: 'Radiohead', imageUrl: 'http://i/ok.png' },
    ]);
  });

  it('prefers extralarge, then large, then medium, regardless of array order', async () => {
    fetchMock.mockResolvedValue(
      okResponse({
        topalbums: {
          album: [
            album('all', [img('small', 's'), img('medium', 'm'), img('large', 'l'), img('extralarge', 'xl')]),
            album('large+medium', [img('medium', 'm'), img('large', 'l')]),
            album('medium+small', [img('small', 's'), img('medium', 'm')]),
            album('empty xl falls back', [img('extralarge', ''), img('large', 'l2')]),
          ],
        },
      }),
    );
    const { getTopTracks } = await loadService();
    const result = await getTopTracks('rj');
    expect(result.map((t) => [t.name, t.imageUrl])).toEqual([
      ['all', 'xl'],
      ['large+medium', 'l'],
      ['medium+small', 'm'],
      ['empty xl falls back', 'l2'],
    ]);
  });

  it('filters out albums that have no usable image', async () => {
    fetchMock.mockResolvedValue(
      okResponse({
        topalbums: {
          album: [
            album('keep', [img('large', 'l')]),
            album('no images', []),
            album('blank images', [img('extralarge', ''), img('large', ''), img('medium', '')]),
            album('small only', [img('small', 's')]),
            album('keep too', [img('medium', 'm')]),
          ],
        },
      }),
    );
    const { getTopTracks } = await loadService();
    const result = await getTopTracks('rj');
    expect(result.map((t) => t.name)).toEqual(['keep', 'keep too']);
  });
});
